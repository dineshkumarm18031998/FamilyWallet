import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/', (req, res) => {
  res.send('FamilyWallet API is running');
});

// ----------------------------------------------------
// AUTH API
// ----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  const { phone, password, name } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });

  try {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) return res.status(400).json({ error: 'Phone number already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { phone, password: hashedPassword, name }
    });
    res.json({ success: true, token: user.id, phone: user.phone, name: user.name });
  } catch (err) {
    res.status(500).json({ error: 'Database error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });
  
  try {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });
    res.json({ success: true, token: user.id, phone: user.phone, name: user.name });
  } catch (err) {
    res.status(500).json({ error: 'Database error during login' });
  }
});

// ----------------------------------------------------
// FAMILY API
// ----------------------------------------------------
app.post('/api/family/create', async (req, res) => {
  const { userId, name } = req.body;
  try {
    // 1. Ensure the user actually exists in the cloud DB (Local-First sync)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { 
        id: userId, 
        phone: userId, // Dummy phone to satisfy unique constraint
        password: '',
        name: 'Local User'
      }
    });

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const family = await prisma.family.create({
      data: {
        name,
        inviteCode,
        members: {
          create: { userId, role: 'Owner' }
        }
      },
      include: { members: true }
    });
    
    res.json({ success: true, family });
  } catch (err: any) {
    console.error("Family Create Error:", err);
    res.status(500).json({ error: 'Failed to create family' });
  }
});

app.post('/api/family/join', async (req, res) => {
  const { userId, inviteCode } = req.body;
  try {
    const family = await prisma.family.findUnique({ where: { inviteCode } });
    if (!family) return res.status(404).json({ error: 'Invalid invite code' });

    // Check if user is already a member
    const existingMember = await prisma.familyMember.findFirst({
      where: { userId, familyId: family.id }
    });
    
    if (existingMember) {
      return res.status(400).json({ error: 'You are already a member of this family' });
    }

    const member = await prisma.familyMember.create({
      data: { userId, familyId: family.id, role: 'Member' }
    });
    res.json({ success: true, family });
  } catch (err: any) {
    console.error("Family Join Error:", err);
    res.status(500).json({ error: 'Failed to join family' });
  }
});

app.get('/api/family/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const member = await prisma.familyMember.findFirst({
      where: { userId },
      include: {
        family: {
          include: {
            members: { include: { user: true } },
            expenses: { where: { visibility: 'Shared' } }
          }
        }
      }
    });
    
    if (!member) {
      return res.json({ hasFamily: false });
    }

    // Calculate totals
    const family = member.family;
    const sharedTotal = family.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const formattedMembers = family.members.map(m => {
      const spent = family.expenses.filter(e => e.userId === m.userId).reduce((s, e) => s + e.amount, 0);
      return {
        id: m.id,
        userId: m.userId,
        name: m.user.phone, // fallback to phone if no name
        role: m.role,
        spent
      };
    });

    res.json({
      hasFamily: true,
      data: {
        id: family.id,
        name: family.name,
        code: family.inviteCode,
        sharedTotal,
        members: formattedMembers
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch family' });
  }
});

// ----------------------------------------------------
// SYNC API - PUSH (Mobile -> Cloud)
// ----------------------------------------------------
app.post('/api/sync/push', async (req, res) => {
  const { userId, expenses } = req.body;
  
  if (!userId || !expenses || !Array.isArray(expenses)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    // Ensure the syncing user exists in the cloud DB
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { 
        id: userId, 
        phone: userId, // Dummy phone
        password: '',
        name: 'Local User'
      }
    });

    const results = [];
    
    // Upsert expenses to prevent duplicates
    for (const exp of expenses) {
      const saved = await prisma.expense.upsert({
        where: { id: exp.id },
        update: {
          amount: exp.amount,
          merchant: exp.merchant,
          category: exp.category,
          visibility: exp.visibility,
          date: new Date(exp.date),
          notes: exp.notes,
          source: exp.source || 'Manual'
        },
        create: {
          id: exp.id,
          amount: exp.amount,
          merchant: exp.merchant,
          category: exp.category,
          visibility: exp.visibility,
          date: new Date(exp.date),
          notes: exp.notes,
          source: exp.source || 'Manual',
          userId: userId,
        }
      });
      results.push(saved);
    }
    
    res.json({ success: true, syncedCount: results.length });
  } catch (error) {
    console.error('Push Sync Error:', error);
    res.status(500).json({ error: 'Failed to push data' });
  }
});

// ----------------------------------------------------
// SYNC API - DELETE (Mobile -> Cloud)
// ----------------------------------------------------
app.post('/api/sync/delete', async (req, res) => {
  const { userId, expenseId } = req.body;
  if (!userId || !expenseId) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (existing) {
      await prisma.expense.delete({ where: { id: expenseId } });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete Sync Error:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// ----------------------------------------------------
// SYNC API - PULL (Cloud -> Mobile)
// ----------------------------------------------------
app.get('/api/sync/pull/:userId', async (req, res) => {
  const { userId } = req.params;
  const { lastSyncTime } = req.query;

  try {
    // 1. Get families this user belongs to
    const memberships = await prisma.familyMember.findMany({
      where: { userId },
      select: { familyId: true }
    });
    const familyIds = memberships.map(m => m.familyId);

    // 2. Pull all personal expenses OR shared expenses from their families
    const newExpenses = await prisma.expense.findMany({
      where: {
        OR: [
          { userId: userId },
          {
            familyId: { in: familyIds },
            visibility: 'Shared'
          }
        ]
      },
      orderBy: { date: 'desc' }
    });

    res.json({ success: true, data: newExpenses });
  } catch (error) {
    console.error('Pull Sync Error:', error);
    res.status(500).json({ error: 'Failed to pull data' });
  }
});

// ----------------------------------------------------
// SETTINGS API
// ----------------------------------------------------
app.post('/api/settings/update', async (req, res) => {
  const { userId, sharePrivateDetails } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: { sharePrivateDetails },
      create: { userId, sharePrivateDetails }
    });
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Settings Update Error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FamilyWallet Sync Server running on port ${PORT}`);
});

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
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
app.post('/api/auth/login', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  
  try {
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({ data: { phone } });
    }
    // Mocking real SMS dispatch
    res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Missing phone or OTP' });
  
  if (otp !== '123456') return res.status(401).json({ error: 'Invalid OTP' });

  try {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, token: user.id });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ----------------------------------------------------
// FAMILY API
// ----------------------------------------------------
app.post('/api/family/create', async (req, res) => {
  const { userId, name } = req.body;
  try {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const family = await prisma.family.create({
      data: {
        name,
        inviteCode,
        members: {
          create: { userId, role: 'Owner' }
        }
      }
    });
    // Also update user record
    await prisma.user.update({
      where: { id: userId },
      data: { familyMembers: { connect: { id: family.members[0].id } } }
    });
    res.json({ success: true, family });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create family' });
  }
});

app.post('/api/family/join', async (req, res) => {
  const { userId, inviteCode } = req.body;
  try {
    const family = await prisma.family.findUnique({ where: { inviteCode } });
    if (!family) return res.status(404).json({ error: 'Invalid invite code' });

    const member = await prisma.familyMember.create({
      data: { userId, familyId: family.id, role: 'Member' }
    });
    res.json({ success: true, family });
  } catch (err) {
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
    const results = [];
    
    // In a real app, this should be an upsert and wrapped in a transaction
    for (const exp of expenses) {
      // Mocking family resolution for now
      const saved = await prisma.expense.create({
        data: {
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
// SYNC API - PULL (Cloud -> Mobile)
// ----------------------------------------------------
app.get('/api/sync/pull/:userId', async (req, res) => {
  const { userId } = req.params;
  const { lastSyncTime } = req.query;

  try {
    const newExpenses = await prisma.expense.findMany({
      where: {
        userId: userId,
        // In a real scenario, check if date > lastSyncTime
      },
      orderBy: { date: 'desc' }
    });

    res.json({ success: true, data: newExpenses });
  } catch (error) {
    console.error('Pull Sync Error:', error);
    res.status(500).json({ error: 'Failed to pull data' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FamilyWallet Sync Server running on port ${PORT}`);
});

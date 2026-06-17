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
  if (!userId || !name) return res.status(400).json({ error: 'Missing userId or name' });

  try {
    // Retry on invite-code collision (P2002 unique constraint violation)
    let family;
    let attempts = 0;
    while (attempts < 5) {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      try {
        family = await prisma.family.create({
          data: {
            name,
            inviteCode,
            members: {
              create: { userId, role: 'Owner' }
            }
          },
          include: { members: true }
        });
        break;
      } catch (err: any) {
        if (err.code === 'P2002') {
          attempts++;
          continue; // invite code collision, retry with a new code
        }
        throw err;
      }
    }

    if (!family) {
      return res.status(500).json({ error: 'Failed to generate a unique invite code, please try again' });
    }

    // Backfill familyId on this user's existing expenses so previously
    // synced Shared expenses become visible to family members immediately.
    await prisma.expense.updateMany({
      where: { userId },
      data: { familyId: family.id }
    });

    res.json({ success: true, family });
  } catch (err: any) {
    console.error("Family Create Error:", err);
    res.status(500).json({ error: 'Failed to create family' });
  }
});

app.post('/api/family/join', async (req, res) => {
  const { userId, inviteCode } = req.body;
  if (!userId || !inviteCode) return res.status(400).json({ error: 'Missing userId or inviteCode' });

  try {
    const family = await prisma.family.findUnique({ where: { inviteCode: inviteCode.toUpperCase() } });
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

    // Backfill familyId on this user's existing expenses so previously
    // synced Shared expenses become visible to family members immediately.
    await prisma.expense.updateMany({
      where: { userId },
      data: { familyId: family.id }
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
            members: { include: { user: { include: { settings: true } } } },
            expenses: { where: { isDeleted: false } }
          }
        }
      }
    });
    
    if (!member) {
      return res.json({ hasFamily: false });
    }

    // Calculate totals based on visibility logic:
    // Dinesh sees Google's private expenses only if Google settings toggle (sharePrivateDetails) is ON.
    const family = member.family;
    const visibleExpenses = family.expenses.filter(e => {
      if (e.visibility === 'Shared') return true;
      // It is Private. Check if it belongs to the current user (always visible to self) or if the owner has settings on
      if (e.userId === userId) return true;
      const ownerMember = family.members.find(m => m.userId === e.userId);
      return ownerMember?.user?.settings?.sharePrivateDetails === true;
    });

    const sharedTotal = visibleExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const formattedMembers = await Promise.all(family.members.map(async (m) => {
      const spent = visibleExpenses.filter(e => e.userId === m.userId).reduce((s, e) => s + e.amount, 0);
      const displayName = m.user?.name || m.user?.phone || 'Member';
      const sharePrivateDetails = m.user?.settings?.sharePrivateDetails === true;

      let history;
      // Show details if the member shares them, or if it is the user's own card
      if (sharePrivateDetails || m.userId === userId) {
        const allMemberExpenses = await prisma.expense.findMany({
          where: { userId: m.userId, isDeleted: false },
          orderBy: { date: 'desc' }
        });

        const sumSince = (since: Date) =>
          allMemberExpenses.filter(e => e.date >= since).reduce((s, e) => s + e.amount, 0);

        history = {
          week: sumSince(startOfWeek),
          month: sumSince(startOfMonth),
          year: sumSince(startOfYear),
          recentTransactions: allMemberExpenses.slice(0, 5).map(e => ({
            merchant: e.merchant,
            amount: e.amount,
            category: e.category,
            date: e.date
          }))
        };
      }

      return {
        id: m.id,
        userId: m.userId,
        name: displayName,
        role: m.role,
        spent,
        sharePrivateDetails,
        history
      };
    }));

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
    console.error("Family Fetch Error:", err);
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

    // Look up this user's family (if any) so we can tag pushed expenses
    // with familyId - required for /api/sync/pull to find Shared expenses
    // belonging to family members.
    const membership = await prisma.familyMember.findFirst({
      where: { userId },
      select: { familyId: true }
    });
    const familyId = membership?.familyId || null;

    const results = [];
        // Upsert expenses to prevent duplicates
      for (const exp of expenses) {
        const parsedDate = exp.date ? new Date(exp.date) : new Date();
        const parsedUpdated = exp.updatedAt ? new Date(exp.updatedAt) : new Date();
        
        const saved = await prisma.expense.upsert({
          where: { id: exp.id },
          update: {
            amount: exp.amount,
            merchant: exp.merchant,
            category: exp.category,
            subcategory: exp.subcategory || null,
            paymentMethod: exp.paymentMethod || null,
            visibility: exp.visibility,
            date: parsedDate,
            notes: exp.notes,
            source: exp.source || 'Manual',
            isDeleted: exp.isDeleted === 1 || exp.isDeleted === true,
            updatedAt: parsedUpdated,
            familyId: familyId
          },
          create: {
            id: exp.id,
            amount: exp.amount,
            merchant: exp.merchant,
            category: exp.category,
            subcategory: exp.subcategory || null,
            paymentMethod: exp.paymentMethod || null,
            visibility: exp.visibility,
            date: parsedDate,
            notes: exp.notes,
            source: exp.source || 'Manual',
            isDeleted: exp.isDeleted === 1 || exp.isDeleted === true,
            updatedAt: parsedUpdated,
            userId: userId,
            familyId: familyId
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

    // 2. Find all members in these families who have sharePrivateDetails = true
    const sharingMembers = await prisma.familyMember.findMany({
       where: { familyId: { in: familyIds } },
       include: { user: { include: { settings: true } } }
    });
    const sharingUserIds = sharingMembers
       .filter(m => m.user?.settings?.sharePrivateDetails === true)
       .map(m => m.userId);

    // 3. Pull all personal expenses OR shared expenses OR approved private expenses
    const newExpenses = await prisma.expense.findMany({
      where: {
        OR: [
          { userId: userId }, // My own expenses
          {
            familyId: { in: familyIds },
            visibility: 'Shared' // Family shared expenses
          },
          {
            familyId: { in: familyIds },
            userId: { in: sharingUserIds },
            visibility: 'Private' // Private expenses of members who opted to share
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

app.get('/api/settings/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const settings = await prisma.settings.findUnique({
      where: { userId }
    });
    res.json({ success: true, data: settings || { sharePrivateDetails: false } });
  } catch (error) {
    console.error('Fetch Settings Error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ----------------------------------------------------
// SETTINGS API
// ----------------------------------------------------
app.post('/api/settings/update', async (req, res) => {
  const { userId, ...settingsPayload } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: { ...settingsPayload },
      create: { userId, ...settingsPayload }
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

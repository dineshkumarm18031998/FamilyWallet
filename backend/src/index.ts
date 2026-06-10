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

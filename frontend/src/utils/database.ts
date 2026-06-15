import * as SQLite from 'expo-sqlite';
import { API_URL } from './apiConfig';
import * as Crypto from 'expo-crypto';

export const initDB = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      merchant TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      paymentMethod TEXT,
      visibility TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      source TEXT DEFAULT 'Manual',
      syncStatus TEXT DEFAULT 'Pending',
      userId TEXT NOT NULL DEFAULT '',
      isDeleted INTEGER DEFAULT 0,
      updatedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      userId TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS review_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      merchant TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      confidence INTEGER DEFAULT 100,
      preview TEXT,
      timestamp INTEGER
    );
    CREATE TABLE IF NOT EXISTS tracking_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      trackGrocery INTEGER DEFAULT 0,
      trackFood INTEGER DEFAULT 0,
      trackRecharge INTEGER DEFAULT 0,
      trackDTH INTEGER DEFAULT 0,
      trackUtilities INTEGER DEFAULT 0,
      sharePrivateDetails INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS budgets (
      category TEXT PRIMARY KEY,
      target INTEGER NOT NULL
    );
  `);

  try {
    // Seed default budgets
    await db.execAsync(`
      INSERT OR IGNORE INTO budgets (category, target) VALUES 
      ('Groceries', 15000), 
      ('Food', 5000), 
      ('Recharge', 2000), 
      ('Utilities', 4000);
    `);
  } catch (e) {
    console.error(e);
  }

  const migrations = [
    "ALTER TABLE expenses ADD COLUMN source TEXT DEFAULT 'Manual';",
    "ALTER TABLE expenses ADD COLUMN userId TEXT DEFAULT '';",
    "ALTER TABLE review_queue ADD COLUMN confidence INTEGER DEFAULT 100;",
    "ALTER TABLE review_queue ADD COLUMN preview TEXT;",
    "ALTER TABLE review_queue ADD COLUMN timestamp INTEGER;",
    "ALTER TABLE tracking_settings ADD COLUMN trackUtilities INTEGER DEFAULT 0;",
    "ALTER TABLE session ADD COLUMN phone TEXT;",
    "ALTER TABLE session ADD COLUMN name TEXT;",
    "ALTER TABLE expenses ADD COLUMN subcategory TEXT;",
    "ALTER TABLE expenses ADD COLUMN paymentMethod TEXT;",
    "ALTER TABLE expenses ADD COLUMN isDeleted INTEGER DEFAULT 0;",
    "ALTER TABLE expenses ADD COLUMN updatedAt TEXT;"
  ];

  for (const m of migrations) {
    try {
      await db.execAsync(m);
    } catch (e) {
      // Column already exists, ignore
    }
  }

  try {
    // Initialize default tracking settings if empty (Default ON)
    await db.execAsync("INSERT OR IGNORE INTO tracking_settings (id, trackGrocery, trackFood, trackRecharge, trackDTH, trackUtilities, sharePrivateDetails) VALUES (1, 1, 1, 1, 1, 1, 0);");
    
    // Force migrate existing users who had it stuck on 0
    await db.execAsync("UPDATE tracking_settings SET trackGrocery=1, trackFood=1, trackRecharge=1, trackDTH=1, trackUtilities=1 WHERE id=1 AND trackGrocery=0 AND trackFood=0 AND trackRecharge=0 AND trackDTH=0;");
  } catch (e) {
    console.error(e);
  }
};

export const addExpense = async (db: SQLite.SQLiteDatabase, amount: number, merchant: string, category: string, subcategory: string = '', paymentMethod: string = '', visibility: string, notes: string, source: string = 'Manual') => {
  const sessionUserId = await getSession(db);
  const userId = sessionUserId || '';
  
  const date = new Date().toISOString();
  const id = Crypto.randomUUID();
  
  await db.runAsync(
    'INSERT INTO expenses (id, amount, merchant, category, subcategory, paymentMethod, visibility, date, notes, source, syncStatus, userId, isDeleted, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
    [id, amount, merchant, category, subcategory || null, paymentMethod || null, visibility, date, notes, source, 'Pending', userId, date]
  );

  // Auto-sync trigger
  syncWithCloud(db).catch(console.warn);

  return id;
};

export const setSession = async (db: SQLite.SQLiteDatabase, userId: string, phone: string = '', name: string = '') => {
  await db.runAsync('INSERT OR REPLACE INTO session (id, userId, phone, name) VALUES (1, ?, ?, ?)', [userId, phone, name]);
};

export const getSession = async (db: SQLite.SQLiteDatabase) => {
  const row: any = await db.getFirstAsync('SELECT * FROM session WHERE id = 1');
  return row?.userId || null;
};

export const getProfile = async (db: SQLite.SQLiteDatabase) => {
  const row: any = await db.getFirstAsync('SELECT * FROM session WHERE id = 1');
  return row ? { userId: row.userId, phone: row.phone, name: row.name } : null;
};

export const clearSession = async (db: SQLite.SQLiteDatabase) => {
  await db.runAsync('DELETE FROM session WHERE id = 1');
};

export const getRecentExpenses = async (db: SQLite.SQLiteDatabase, limit: number = 5) => {
  const sessionUserId = await getSession(db);
  const userId = sessionUserId || '';
  // Show: my own expenses (any visibility) + Shared expenses from family members
  const allRows = await db.getAllAsync(
    "SELECT * FROM expenses WHERE userId = ? OR visibility = 'Shared' ORDER BY date DESC LIMIT ?",
    [userId, limit]
  );
  return allRows;
};

export const getAllExpenses = async (db: SQLite.SQLiteDatabase, mode: 'My Wallet' | 'Family Wallet' = 'My Wallet') => {
  const sessionUserId = await getSession(db);
  const userId = sessionUserId || '';
  
  let query = "";
  let params: any[] = [];
  
  if (mode === 'My Wallet') {
    query = "SELECT * FROM expenses WHERE userId = ? AND isDeleted = 0 ORDER BY date DESC";
    params = [userId];
  } else {
    query = "SELECT * FROM expenses WHERE visibility = 'Shared' AND isDeleted = 0 ORDER BY date DESC";
  }
  
  const allRows = await db.getAllAsync(query, params);
  return allRows;
};

export const getWalletTotals = async (db: SQLite.SQLiteDatabase) => {
  const sessionUserId = await getSession(db);
  const userId = sessionUserId || '';

  // My Wallet total = ALL expenses from me (private and shared)
  const myWalletResult: any = await db.getFirstAsync("SELECT SUM(amount) as total FROM expenses WHERE userId = ? AND isDeleted = 0", [userId]);
  
  // Family Wallet total = ALL Shared expenses
  const familyWalletResult: any = await db.getFirstAsync("SELECT SUM(amount) as total FROM expenses WHERE visibility = 'Shared' AND isDeleted = 0");
  
  return {
    privateTotal: Math.round((myWalletResult?.total || 0) * 100) / 100,
    sharedTotal: Math.round((familyWalletResult?.total || 0) * 100) / 100
  };
};

export const getCategoryTotals = async (db: SQLite.SQLiteDatabase, mode: 'My Wallet' | 'Family Wallet' = 'My Wallet') => {
  const sessionUserId = await getSession(db);
  const userId = sessionUserId || '';
  
  let query = "";
  let params: any[] = [];
  
  if (mode === 'My Wallet') {
    query = "SELECT category, SUM(amount) as total FROM expenses WHERE userId = ? AND isDeleted = 0 GROUP BY category ORDER BY total DESC";
    params = [userId];
  } else {
    query = "SELECT category, SUM(amount) as total FROM expenses WHERE visibility = 'Shared' AND isDeleted = 0 GROUP BY category ORDER BY total DESC";
  }
  
  const result: any[] = await db.getAllAsync(query, params);
  return result.map(r => ({
    ...r,
    total: Math.round((r.total || 0) * 100) / 100
  }));
};

export const getHistoricalTrends = async (db: SQLite.SQLiteDatabase, timeframe: 'Weekly' | 'Monthly' | 'Yearly') => {
  const sessionUserId = await getSession(db);
  const userId = sessionUserId || '';
  const visClause = "(userId = ? OR visibility = 'Shared')";

  let query = '';
  if (timeframe === 'Weekly') {
    query = `
      SELECT strftime('%Y-%W', date) as bucket, category, SUM(amount) as total 
      FROM expenses 
      WHERE date >= date('now', '-84 days') AND ${visClause}
      GROUP BY bucket, category 
      ORDER BY bucket ASC
    `;
  } else if (timeframe === 'Monthly') {
    query = `
      SELECT strftime('%Y-%m', date) as bucket, category, SUM(amount) as total 
      FROM expenses 
      WHERE date >= date('now', '-12 months') AND ${visClause}
      GROUP BY bucket, category 
      ORDER BY bucket ASC
    `;
  } else {
    query = `
      SELECT strftime('%Y', date) as bucket, category, SUM(amount) as total 
      FROM expenses 
      WHERE ${visClause}
      GROUP BY bucket, category 
      ORDER BY bucket ASC
    `;
  }
  
  const result: any[] = await db.getAllAsync(query, [userId]);
  return result;
};

export const syncWithCloud = async (db: SQLite.SQLiteDatabase) => {
  try {
    const userId = await getSession(db);
    if (!userId) return { success: false, message: 'Not logged in' };
    
    // 1. PUSH PENDING
    const pendingExpenses = await db.getAllAsync("SELECT * FROM expenses WHERE syncStatus = 'Pending'");
    if (pendingExpenses.length > 0) {
      const response = await fetch(`${API_URL}/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, expenses: pendingExpenses })
      });
      const result = await response.json();
      if (result.success) {
        await db.runAsync("UPDATE expenses SET syncStatus = 'Synced' WHERE syncStatus = 'Pending'");
      }
    }

    // 2. PULL LATEST FROM CLOUD
    const pullRes = await fetch(`${API_URL}/sync/pull/${userId}`);
    const pullData = await pullRes.json();
    if (pullData.success && pullData.data) {
      for (const exp of pullData.data) {
        if (exp.isDeleted) {
          await db.runAsync("UPDATE expenses SET isDeleted = 1, syncStatus = 'Synced' WHERE id = ?", [exp.id]);
        } else {
          await db.runAsync(
            'INSERT OR REPLACE INTO expenses (id, amount, merchant, category, subcategory, paymentMethod, visibility, date, notes, source, syncStatus, userId, isDeleted, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [exp.id, exp.amount, exp.merchant, exp.category, exp.subcategory || null, exp.paymentMethod || null, exp.visibility, exp.date, exp.notes, exp.source, 'Synced', exp.userId, 0, exp.updatedAt || new Date().toISOString()]
          );
        }
      }
    }

    return { success: true, message: 'Sync complete' };
  } catch (error) {
    console.error('Sync Error:', error);
    return { success: false, message: 'Network error. Make sure backend is running.' };
  }
};

export const deleteExpense = async (db: SQLite.SQLiteDatabase, id: string) => {
  // Tombstone logic instead of hard delete
  await db.runAsync("UPDATE expenses SET isDeleted = 1, syncStatus = 'Pending' WHERE id = ?", [id]);
  syncWithCloud(db).catch(console.warn);
};

export const updateExpense = async (db: SQLite.SQLiteDatabase, id: string, amount: number, merchant: string, category: string, subcategory?: string, paymentMethod?: string, visibility?: string) => {
  const date = new Date().toISOString();
  if (visibility) {
    await db.runAsync(
      "UPDATE expenses SET amount = ?, merchant = ?, category = ?, subcategory = ?, paymentMethod = ?, visibility = ?, updatedAt = ?, syncStatus = 'Pending' WHERE id = ?",
      [amount, merchant, category, subcategory || null, paymentMethod || null, visibility, date, id]
    );
  } else {
    await db.runAsync(
      "UPDATE expenses SET amount = ?, merchant = ?, category = ?, subcategory = ?, paymentMethod = ?, updatedAt = ?, syncStatus = 'Pending' WHERE id = ?",
      [amount, merchant, category, subcategory || null, paymentMethod || null, date, id]
    );
  }
  syncWithCloud(db).catch(console.warn);
};

export const getWalletTotalsForMonth = async (db: SQLite.SQLiteDatabase, year: number, month: number) => {
  const sessionUserId = await getSession(db);
  const userId = sessionUserId || '';

  const start = new Date(year, month - 1, 1, 0, 0, 0).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();

  // My Wallet total
  const myWalletResult: any = await db.getFirstAsync("SELECT SUM(amount) as total FROM expenses WHERE userId = ? AND isDeleted = 0 AND date >= ? AND date <= ?", [userId, start, end]);
  // Family Wallet total
  const familyWalletResult: any = await db.getFirstAsync("SELECT SUM(amount) as total FROM expenses WHERE visibility = 'Shared' AND isDeleted = 0 AND date >= ? AND date <= ?", [start, end]);
  
  return {
    privateTotal: Math.round((myWalletResult?.total || 0) * 100) / 100,
    sharedTotal: Math.round((familyWalletResult?.total || 0) * 100) / 100
  };
};

export const getRecentExpensesForMonth = async (db: SQLite.SQLiteDatabase, year: number, month: number, mode: 'My Wallet' | 'Family Wallet' = 'My Wallet', limit: number = 5) => {
  const sessionUserId = await getSession(db);
  const userId = sessionUserId || '';
  const start = new Date(year, month - 1, 1, 0, 0, 0).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();
  
  let query = "";
  let params: any[] = [];
  if (mode === 'My Wallet') {
    query = "SELECT * FROM expenses WHERE userId = ? AND isDeleted = 0 AND date >= ? AND date <= ? ORDER BY date DESC LIMIT ?";
    params = [userId, start, end, limit];
  } else {
    query = "SELECT * FROM expenses WHERE visibility = 'Shared' AND isDeleted = 0 AND date >= ? AND date <= ? ORDER BY date DESC LIMIT ?";
    params = [start, end, limit];
  }
  
  const allRows = await db.getAllAsync(query, params);
  return allRows;
};

export const getCategoryTotalsForPeriod = async (db: SQLite.SQLiteDatabase, startDate: string, endDate: string) => {
  const sessionUserId = await getSession(db);
  const userId = sessionUserId || '';
  const result: any[] = await db.getAllAsync(
    "SELECT category, SUM(amount) as total FROM expenses WHERE (userId = ? OR visibility = 'Shared') AND date >= ? AND date <= ? GROUP BY category ORDER BY total DESC",
    [userId, startDate, endDate]
  );
  return result.map(r => ({
    ...r,
    total: Math.round((r.total || 0) * 100) / 100
  }));
};

export const getTrendData = async (db: SQLite.SQLiteDatabase, periodType: 'week' | 'month' | 'year', currentYear: number, currentMonth: number) => {
  // Returns aggregated sum arrays for the chart based on the selected period.
  // We'll process this raw data in JS for simplicity to handle different month lengths.
  const sessionUserId = await getSession(db);
  const userId = sessionUserId || '';
  const visClause = "(userId = ? OR visibility = 'Shared')";

  let query = '';
  let params: any[] = [];

  if (periodType === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const startStr = d.toISOString();
    query = `SELECT date, SUM(amount) as total FROM expenses WHERE date >= ? AND ${visClause} GROUP BY strftime('%Y-%m-%d', date) ORDER BY date ASC`;
    params = [startStr, userId];
  } else if (periodType === 'month') {
    const start = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0).toISOString();
    const end = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();
    query = `SELECT date, SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ? AND ${visClause} GROUP BY strftime('%Y-%m-%d', date) ORDER BY date ASC`;
    params = [start, end, userId];
  } else if (periodType === 'year') {
    const start = new Date(currentYear, 0, 1, 0, 0, 0).toISOString();
    const end = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();
    query = `SELECT date, SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ? AND ${visClause} GROUP BY strftime('%Y-%m', date) ORDER BY date ASC`;
    params = [start, end, userId];
  }

  const rawData: any[] = await db.getAllAsync(query, params);
  return rawData;
};

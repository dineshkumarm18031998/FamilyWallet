import * as SQLite from 'expo-sqlite';
import { API_URL } from './apiConfig';
import * as Crypto from 'expo-crypto';

export const initDB = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    DROP TABLE IF EXISTS expenses;
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      merchant TEXT NOT NULL,
      category TEXT NOT NULL,
      visibility TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      source TEXT DEFAULT 'Manual',
      syncStatus TEXT DEFAULT 'Pending'
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
    // Migrate old databases seamlessly
    await db.execAsync("ALTER TABLE expenses ADD COLUMN source TEXT DEFAULT 'Manual';");
    await db.execAsync("ALTER TABLE review_queue ADD COLUMN confidence INTEGER DEFAULT 100;");
    await db.execAsync("ALTER TABLE review_queue ADD COLUMN preview TEXT;");
    await db.execAsync("ALTER TABLE review_queue ADD COLUMN timestamp INTEGER;");
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    // Initialize default tracking settings if empty (Default ON)
    await db.execAsync("INSERT OR IGNORE INTO tracking_settings (id, trackGrocery, trackFood, trackRecharge, trackDTH, sharePrivateDetails) VALUES (1, 1, 1, 1, 1, 0);");
    
    // Force migrate existing users who had it stuck on 0
    await db.execAsync("UPDATE tracking_settings SET trackGrocery=1, trackFood=1, trackRecharge=1, trackDTH=1 WHERE id=1 AND trackGrocery=0 AND trackFood=0 AND trackRecharge=0 AND trackDTH=0;");
  } catch (e) {
    console.error(e);
  }
};

export const addExpense = async (db: SQLite.SQLiteDatabase, amount: number, merchant: string, category: string, visibility: string, notes: string, source: string = 'Manual') => {
  const date = new Date().toISOString();
  const id = Crypto.randomUUID();
  
  await db.runAsync(
    'INSERT INTO expenses (id, amount, merchant, category, visibility, date, notes, source, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, amount, merchant, category, visibility, date, notes, source, 'Pending']
  );

  // Auto-sync trigger
  syncWithCloud(db).catch(console.warn);

  return id;
};

export const setSession = async (db: SQLite.SQLiteDatabase, userId: string) => {
  await db.runAsync('INSERT OR REPLACE INTO session (id, userId) VALUES (1, ?)', [userId]);
};

export const getSession = async (db: SQLite.SQLiteDatabase) => {
  const row: any = await db.getFirstAsync('SELECT userId FROM session WHERE id = 1');
  return row?.userId || null;
};

export const clearSession = async (db: SQLite.SQLiteDatabase) => {
  await db.runAsync('DELETE FROM session WHERE id = 1');
};

export const getRecentExpenses = async (db: SQLite.SQLiteDatabase, limit: number = 5) => {
  const allRows = await db.getAllAsync('SELECT * FROM expenses ORDER BY date DESC LIMIT ?', [limit]);
  return allRows;
};

export const getAllExpenses = async (db: SQLite.SQLiteDatabase) => {
  const allRows = await db.getAllAsync('SELECT * FROM expenses ORDER BY date DESC');
  return allRows;
};

export const getWalletTotals = async (db: SQLite.SQLiteDatabase) => {
  const sharedResult: any = await db.getFirstAsync("SELECT SUM(amount) as total FROM expenses WHERE visibility = 'Shared'");
  const privateResult: any = await db.getFirstAsync("SELECT SUM(amount) as total FROM expenses WHERE visibility = 'Private'");
  
  return {
    sharedTotal: Math.round((sharedResult?.total || 0) * 100) / 100,
    privateTotal: Math.round((privateResult?.total || 0) * 100) / 100
  };
};

export const getCategoryTotals = async (db: SQLite.SQLiteDatabase) => {
  const result: any[] = await db.getAllAsync('SELECT category, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC');
  return result.map(r => ({
    ...r,
    total: Math.round((r.total || 0) * 100) / 100
  }));
};

export const syncWithCloud = async (db: SQLite.SQLiteDatabase) => {
  try {
    const userId = await getSession(db) || "user_123_temp";
    
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
        await db.runAsync(
          'INSERT OR IGNORE INTO expenses (id, amount, merchant, category, visibility, date, notes, source, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [exp.id, exp.amount, exp.merchant, exp.category, exp.visibility, exp.date, exp.notes, exp.source, 'Synced']
        );
      }
    }

    return { success: true, message: 'Sync complete' };
  } catch (error) {
    console.error('Sync Error:', error);
    return { success: false, message: 'Network error. Make sure backend is running.' };
  }
};

export const deleteExpense = async (db: SQLite.SQLiteDatabase, id: string) => {
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
  
  try {
    const userId = await getSession(db) || "user_123_temp";
    await fetch(`${API_URL}/sync/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, expenseId: id })
    });
  } catch (e) {
    console.warn('Failed to delete on cloud:', e);
  }

  syncWithCloud(db).catch(console.warn);
};

export const updateExpense = async (db: SQLite.SQLiteDatabase, id: string, amount: number, merchant: string, category: string) => {
  await db.runAsync(
    "UPDATE expenses SET amount = ?, merchant = ?, category = ?, syncStatus = 'Pending' WHERE id = ?",
    [amount, merchant, category, id]
  );
  syncWithCloud(db).catch(console.warn);
};

export const getWalletTotalsForMonth = async (db: SQLite.SQLiteDatabase, year: number, month: number) => {
  const start = new Date(year, month - 1, 1, 0, 0, 0).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();

  const sharedResult: any = await db.getFirstAsync("SELECT SUM(amount) as total FROM expenses WHERE visibility = 'Shared' AND date >= ? AND date <= ?", [start, end]);
  const privateResult: any = await db.getFirstAsync("SELECT SUM(amount) as total FROM expenses WHERE visibility = 'Private' AND date >= ? AND date <= ?", [start, end]);
  
  return {
    sharedTotal: Math.round((sharedResult?.total || 0) * 100) / 100,
    privateTotal: Math.round((privateResult?.total || 0) * 100) / 100
  };
};

export const getRecentExpensesForMonth = async (db: SQLite.SQLiteDatabase, year: number, month: number, limit: number = 5) => {
  const start = new Date(year, month - 1, 1, 0, 0, 0).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();
  const allRows = await db.getAllAsync('SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC LIMIT ?', [start, end, limit]);
  return allRows;
};

export const getCategoryTotalsForPeriod = async (db: SQLite.SQLiteDatabase, startDate: string, endDate: string) => {
  const result: any[] = await db.getAllAsync(
    'SELECT category, SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ? GROUP BY category ORDER BY total DESC',
    [startDate, endDate]
  );
  return result.map(r => ({
    ...r,
    total: Math.round((r.total || 0) * 100) / 100
  }));
};

export const getTrendData = async (db: SQLite.SQLiteDatabase, periodType: 'week' | 'month' | 'year', currentYear: number, currentMonth: number) => {
  // Returns aggregated sum arrays for the chart based on the selected period.
  // We'll process this raw data in JS for simplicity to handle different month lengths.
  
  let query = '';
  let params: any[] = [];

  if (periodType === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const startStr = d.toISOString();
    query = "SELECT date, SUM(amount) as total FROM expenses WHERE date >= ? GROUP BY strftime('%Y-%m-%d', date) ORDER BY date ASC";
    params = [startStr];
  } else if (periodType === 'month') {
    const start = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0).toISOString();
    const end = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();
    query = "SELECT date, SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ? GROUP BY strftime('%Y-%m-%d', date) ORDER BY date ASC";
    params = [start, end];
  } else if (periodType === 'year') {
    const start = new Date(currentYear, 0, 1, 0, 0, 0).toISOString();
    const end = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();
    query = "SELECT date, SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ? GROUP BY strftime('%Y-%m', date) ORDER BY date ASC";
    params = [start, end];
  }

  const rawData: any[] = await db.getAllAsync(query, params);
  return rawData;
};

import * as SQLite from 'expo-sqlite';

export const initDB = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  `);
};

export const addExpense = async (db: SQLite.SQLiteDatabase, amount: number, merchant: string, category: string, visibility: string, notes: string, source: string = 'Manual') => {
  const date = new Date().toISOString();
  
  const result = await db.runAsync(
    'INSERT INTO expenses (amount, merchant, category, visibility, date, notes, source, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [amount, merchant, category, visibility, date, notes, source, 'Pending']
  );
  return result.lastInsertRowId;
};

export const setSession = async (db: SQLite.SQLiteDatabase, userId: string) => {
  await db.runAsync('INSERT OR REPLACE INTO session (id, userId) VALUES (1, ?)', [userId]);
};

export const getSession = async (db: SQLite.SQLiteDatabase) => {
  const row: any = await db.getFirstAsync('SELECT userId FROM session WHERE id = 1');
  return row?.userId || null;
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
    sharedTotal: sharedResult?.total || 0,
    privateTotal: privateResult?.total || 0
  };
};

export const getCategoryTotals = async (db: SQLite.SQLiteDatabase) => {
  const result = await db.getAllAsync('SELECT category, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC');
  return result;
};

export const syncWithCloud = async (db: SQLite.SQLiteDatabase) => {
  try {
    const pendingExpenses = await db.getAllAsync("SELECT * FROM expenses WHERE syncStatus = 'Pending'");
    if (pendingExpenses.length === 0) return { success: true, count: 0, message: 'Already up to date' };

    const userId = await getSession(db) || "user_123_temp";

    const response = await fetch('https://familywallet-production-a87d.up.railway.app/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, expenses: pendingExpenses })
    });

    const result = await response.json();
    if (result.success) {
      await db.runAsync("UPDATE expenses SET syncStatus = 'Synced' WHERE syncStatus = 'Pending'");
      return { success: true, count: result.syncedCount, message: `Successfully synced ${result.syncedCount} expenses` };
    }
    return { success: false, message: 'Server returned an error' };
  } catch (error) {
    console.error('Sync Error:', error);
    return { success: false, message: 'Network error. Make sure backend is running.' };
  }
};

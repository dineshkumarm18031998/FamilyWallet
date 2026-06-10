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
      syncStatus TEXT DEFAULT 'Pending'
    );
  `);
};

export const addExpense = async (db: SQLite.SQLiteDatabase, amount: number, merchant: string, category: string, visibility: string, notes: string) => {
  const date = new Date().toISOString();
  
  const result = await db.runAsync(
    'INSERT INTO expenses (amount, merchant, category, visibility, date, notes, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [amount, merchant, category, visibility, date, notes, 'Pending']
  );
  return result.lastInsertRowId;
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

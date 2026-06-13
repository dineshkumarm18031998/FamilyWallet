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
  `);

  try {
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

import { EventEmitter } from 'expo-modules-core';
import FamilywalletNativeModule from '../../modules/familywallet-native/src/FamilywalletNativeModule';
import * as SQLite from 'expo-sqlite';

const emitter = new EventEmitter(FamilywalletNativeModule as any);

export const initializeNativeEngine = (db: SQLite.SQLiteDatabase) => {
  console.log('Initializing Native Auto-Detect Engine...');

  emitter.addListener('onExpenseDetected', async (event: any) => {
    try {
      console.log('NATIVE ENGINE DETECTED EXPENSE:', event);
      const { amount, merchant, category, source, confidence, preview } = event;
      const date = new Date().toISOString();
      const currentTimestamp = Date.now();

      // 1. Check Tracking Settings
      const settings: any = await db.getFirstAsync('SELECT * FROM tracking_settings WHERE id = 1');
      
      let shouldTrack = true;
      if (category === 'Groceries' && !settings?.trackGrocery) shouldTrack = false;
      if (category === 'Food' && !settings?.trackFood) shouldTrack = false;
      if (category === 'Recharge' && !settings?.trackRecharge) shouldTrack = false;
      if (category === 'DTH' && !settings?.trackDTH) shouldTrack = false;

      if (!shouldTrack) {
        console.log(`Ignored ${merchant} due to Tracking Settings being OFF for ${category}.`);
        return;
      }

      // 2. Duplicate Detection Engine (10-minute window)
      // Query for an existing item with same amount and merchant in the last 10 minutes (600000ms)
      const tenMinsAgo = currentTimestamp - 600000;
      const duplicate: any = await db.getFirstAsync(
        'SELECT id, source FROM review_queue WHERE amount = ? AND merchant = ? AND timestamp > ? AND status = ?',
        [amount, merchant, tenMinsAgo, 'Pending']
      );

      if (duplicate) {
        console.log(`Duplicate detected! Already have ${merchant} ₹${amount} from ${duplicate.source}. Merging and ignoring.`);
        // Optionally update the source to reflect both (e.g., "SMS & Notification")
        if (duplicate.source !== source && !duplicate.source.includes(source)) {
           await db.runAsync(
             'UPDATE review_queue SET source = ? WHERE id = ?',
             [`${duplicate.source} & ${source}`, duplicate.id]
           );
        }
        return;
      }

      // 3. Add to Review Queue
      await db.runAsync(
        'INSERT INTO review_queue (amount, merchant, category, date, source, status, confidence, preview, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [amount, merchant, category, date, source, 'Pending', confidence, preview, currentTimestamp]
      );
      console.log('Successfully pushed to Review Inbox!');

    } catch (e) {
      console.error('Error handling native event:', e);
    }
  });
};

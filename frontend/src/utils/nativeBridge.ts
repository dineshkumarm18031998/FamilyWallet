import { EventEmitter } from 'expo-modules-core';
import FamilywalletNativeModule from '../../modules/familywallet-native/src/FamilywalletNativeModule';
import * as SQLite from 'expo-sqlite';

const emitter = new EventEmitter(FamilywalletNativeModule as any);

export const initializeNativeEngine = (db: SQLite.SQLiteDatabase) => {
  console.log('Initializing Native Auto-Detect Engine...');

  emitter.addListener('onExpenseDetected', async (event: any) => {
    try {
      console.log('NATIVE ENGINE DETECTED EXPENSE:', event);
      const { amount, merchant, category, source } = event;
      const date = new Date().toISOString();

      // Check Tracking Settings
      const settings: any = await db.getFirstAsync('SELECT * FROM tracking_settings WHERE id = 1');
      
      let shouldTrack = true;
      if (category === 'Groceries' && !settings?.trackGrocery) shouldTrack = false;
      if (category === 'Food' && !settings?.trackFood) shouldTrack = false;
      if (category === 'Recharge' && !settings?.trackRecharge) shouldTrack = false;
      if (category === 'DTH' && !settings?.trackDTH) shouldTrack = false;

      if (!shouldTrack) {
        console.log(`Ignored ${merchant} due to Tracking Settings.`);
        return;
      }

      // Add to Review Queue (not directly to expenses!)
      await db.runAsync(
        'INSERT INTO review_queue (amount, merchant, category, date, source, status) VALUES (?, ?, ?, ?, ?, ?)',
        [amount, merchant, category, date, source, 'Pending']
      );
      console.log('Successfully pushed to Review Inbox!');

    } catch (e) {
      console.error('Error handling native event:', e);
    }
  });
};

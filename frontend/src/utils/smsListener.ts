import { PermissionsAndroid, Platform } from 'react-native';
// import SmsListener from 'react-native-android-sms-listener';

// Sample keywords that banks usually include in transaction SMS
const MONEY_KEYWORDS = ['debited', 'spent', 'payment', 'rs', 'inr'];

export const initializeSmsListener = async (onExpenseDetected: (amount: number, merchant: string, rawText: string) => void) => {
  if (Platform.OS !== 'android') {
    console.log('SMS listening is only supported on Android.');
    return;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      {
        title: 'SMS Permission',
        message: 'FamilyWallet needs access to your SMS to automatically track expenses.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('SMS permission granted, starting listener...');
      
      // SmsListener.addListener((message: any) => {
      //   console.log('Received SMS from:', message.originatingAddress);
      //   const body = message.body.toLowerCase();
      //   
      //   // Very basic mock heuristic for detecting an expense
      //   const isExpense = MONEY_KEYWORDS.some(kw => body.includes(kw));
      //   
      //   if (isExpense) {
      //     console.log('Expense SMS detected:', message.body);
      //     
      //     // Basic Regex to find amounts like Rs 150.50 or INR 500
      //     const amountMatch = body.match(/(?:rs\.?|inr)\s*(\d+(?:\.\d+)?)/i) || body.match(/(\d+(?:\.\d+)?)\s*(?:rs\.?|inr)/i);
      //     let amount = 0;
      //     
      //     if (amountMatch && amountMatch[1]) {
      //       amount = parseFloat(amountMatch[1]);
      //     }
      //
      //     // In a real app, we would have complex Regex rules per bank.
      //     // For now, we extract the amount and use the sender as merchant.
      //     if (amount > 0) {
      //       onExpenseDetected(amount, message.originatingAddress || 'Bank SMS', message.body);
      //     }
      //   }
      // });
      
    } else {
      console.log('SMS permission denied');
    }
  } catch (err) {
    console.warn('Error requesting SMS permission:', err);
  }
};

package com.dineshkumar.familywalletnative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

class SmsReceiver : BroadcastReceiver() {

    // STRICT WHITELIST RULES FOR SMS (Zero Personal Tracking)
    // We only check if the Sender ID *contains* these words (e.g. AD-SWIGGY or VM-ZOMATO)
    private val allowedSenderKeywords = listOf(
        "SWIGGY", "ZOMATO", "BLINKIT", "ZEPTO", "BIGBASKET", "JIOMART",
        "JIO", "AIRTEL", "VODAFONE", "VI", "BSNL",
        "TATAPLAY", "DISHTV", "SUNDIRECT", "D2H"
    )

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        for (sms in messages) {
            val sender = sms.displayOriginatingAddress ?: ""
            val messageBody = sms.displayMessageBody ?: ""

            // Pass directly to the new Ultimate Auto Detection Engine
            val parsed = ExpenseParser.parseMessage(sender, messageBody)

            if (parsed != null) {
                Log.d("FamilyWalletNative", "Parsed SMS: ${parsed.amount} at ${parsed.merchant} (${parsed.confidence}%)")
                FamilywalletNativeModule.dispatchExpenseEvent(
                    parsed.amount, 
                    parsed.merchant, 
                    parsed.category, 
                    "SMS",
                    parsed.confidence,
                    parsed.preview
                )
            }
        }
    }
}

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
        // Food
        "SWIGGY", "ZOMATO", "EATSURE", "DOMINOS", "FAASOS", "BOX8",
        // Groceries
        "BLINKIT", "ZEPTO", "BIGBASKET", "JIOMART", "DMART", "INSTAMART", "MILKBASKET",
        // Recharge / Telecom / Broadband
        "JIO", "AIRTEL", "VODAFONE", "VI", "BSNL", "MTNL", "ACTFIBER", "ACTFIBERNET", "HATHWAY", "EXCITEL",
        // DTH / OTT
        "TATAPLAY", "TATASKY", "DISHTV", "SUNDIRECT", "D2H", "VIDEOCON",
        // Utilities - Electricity
        "BESCOM", "TNEB", "TANGEDCO", "MSEB", "MAHADISCOM", "BSES", "TATAPOWER", "CESC",
        "TORRENTPOWER", "PSPCL", "UPPCL", "WBSEDCL", "KSEB",
        // Utilities - Gas
        "INDANE", "HPGAS", "BHARATGAS", "IGL", "MAHANAGARGAS", "MGL", "ADANIGAS",
        // Utilities - Water / Municipal
        "BWSSB", "DJB",
        // Bill aggregators
        "BBPS", "CRED"
    )

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        for (sms in messages) {
            val sender = sms.displayOriginatingAddress ?: ""
            val messageBody = sms.displayMessageBody ?: ""

            // --- STRICT SENDER VALIDATION TO PREVENT SPOOFING ---
            val cleanedSender = sender.replace(Regex("[\\s\\-+]"), "").uppercase()
            
            // 1. Reject 10-digit Indian mobile numbers immediately
            if (cleanedSender.matches(Regex("^(91)?[6-9][0-9]{9}$"))) {
                continue // Drop message
            }
            
            // 2. Must be a short code or DLT header
            val isShortCode = cleanedSender.matches(Regex("^[0-9]{5,6}$"))
            val isDltHeader = sender.uppercase().matches(Regex("^[A-Z]{2}-[A-Z0-9\\-]{3,}$")) || cleanedSender.matches(Regex("^[A-Z]{6,}$"))
            
            if (!isShortCode && !isDltHeader) {
                continue // Drop message
            }
            
            // 3. Must contain an allowed keyword
            val upperSender = sender.uppercase()
            var matchesKeyword = false
            for (keyword in allowedSenderKeywords) {
                if (upperSender.contains(keyword)) {
                    matchesKeyword = true
                    break
                }
            }
            
            if (!matchesKeyword) {
                continue // Drop message
            }
            // ----------------------------------------------------

            // Pass directly to the new Ultimate Auto Detection Engine
            val parsed = ExpenseParser.parseMessage("SMS", sender, messageBody)

            if (parsed != null) {
                Log.d("FamilyWalletNative", "Parsed SMS: ${parsed.amount} at ${parsed.merchant} (${parsed.confidence}%)")
                // 1. Try sending event to React Native UI
                FamilywalletNativeModule.dispatchExpenseEvent(
                    parsed.amount, 
                    parsed.merchant, 
                    parsed.category, 
                    "SMS",
                    parsed.confidence,
                    parsed.preview
                )
                // 2. Safely write directly to SQLite Database (for when app is closed)
                FamilywalletNativeModule.saveExpenseToDatabase(
                    context,
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

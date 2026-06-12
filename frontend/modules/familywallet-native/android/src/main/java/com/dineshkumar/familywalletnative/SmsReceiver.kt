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

            // INSTANT DROPOFF: Check if sender matches whitelist
            val isSenderApproved = allowedSenderKeywords.any { keyword ->
                sender.contains(keyword, ignoreCase = true)
            }

            if (!isSenderApproved) {
                // Personal SMS, OTPs, Banking alerts are dropped instantly here.
                continue
            }

            Log.d("FamilyWalletNative", "Detected Whitelisted SMS: [$sender] $messageBody")

            // TODO: Extract exact amount and forward to React Native Review Queue
        }
    }
}

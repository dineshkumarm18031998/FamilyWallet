package com.dineshkumar.familywalletnative

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class FamilyWalletNotificationService : NotificationListenerService() {

    // STRICT WHITELIST RULES (Zero Personal Tracking)
    private val allowedApps = listOf(
        // Food Apps
        "in.swiggy.android",                      // Swiggy
        "com.application.zomato",                 // Zomato
        "com.eatsure.app",                        // EatSure
        
        // Grocery Apps
        "com.grofers.customerapp",                // Blinkit
        "com.zepto",                              // Zepto
        "com.bigbasket.mobileapp",                // BigBasket
        "com.jpl.jiomart",                        // JioMart
        
        // Recharge Apps
        "com.jio.myjio",                          // MyJio
        "com.myairtelapp",                        // Airtel Thanks
        "com.mventus.selfcare.activity",          // Vi App

        // DTH Apps
        "com.ryzmedia.tatasky",                   // Tata Play
        "tv.accedo.airtel.wynk",                  // Airtel Xstream
        "com.dishtv.activity",                    // Dish TV

        // Amount Extraction Only (As agreed)
        "com.google.android.apps.nbu.paisa.user", // GPay
        "com.phonepe.app"                         // PhonePe
    )

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName

        // 1. INSTANT DROPOFF: If app is not in whitelist, ignore completely.
        if (!allowedApps.contains(packageName)) {
            // e.g., WhatsApp, Gmail, OTPs are dropped instantly here.
            return
        }

        val extras = sbn.notification.extras
        val title = extras.getString("android.title") ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""

        Log.d("FamilyWalletNative", "Detected Whitelisted Notification: [$packageName] Title: $title | Text: $text")

        // Parse amount based on app type
        val amountRegex = Regex("(?i)(?:Rs\\.?|INR|₹)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)")
        val matchResult = amountRegex.find(text) ?: amountRegex.find(title)
        
        if (matchResult != null) {
            val amountStr = matchResult.groupValues[1].replace(",", "")
            val amount = amountStr.toDoubleOrNull() ?: return

            // Assign Category based on Package
            val category = when (packageName) {
                "in.swiggy.android", "com.application.zomato", "com.eatsure.app" -> "Food"
                "com.zepto", "com.grofers.customerapp", "com.bigbasket.mobileapp" -> "Groceries"
                else -> "Shopping"
            }

            var merchantName = title.take(20) // Simple fallback
            if (packageName.contains("swiggy", true)) merchantName = "Swiggy"
            if (packageName.contains("zomato", true)) merchantName = "Zomato"
            if (packageName.contains("google", true) || packageName.contains("phonepe", true)) merchantName = "UPI Transfer"

            // Dispatch to React Native SQLite
            FamilywalletNativeModule.dispatchExpenseEvent(amount, merchantName, category, "Notification")
        }
    }
}

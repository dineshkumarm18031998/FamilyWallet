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
        "com.phonepe.app",                        // PhonePe

        // RCS Chat Interception
        "com.google.android.apps.messaging",      // Google Messages
        "com.samsung.android.messaging"           // Samsung Messages
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
        val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""

        val fullText = "$title $text $bigText"

        // Pass directly to the new Ultimate Auto Detection Engine
        val parsed = ExpenseParser.parseMessage(packageName, fullText)

        if (parsed != null) {
            Log.d("FamilyWalletNative", "Parsed Notification: ${parsed.amount} at ${parsed.merchant} (${parsed.confidence}%)")
            FamilywalletNativeModule.dispatchExpenseEvent(
                parsed.amount, 
                parsed.merchant, 
                parsed.category, 
                "Notification",
                parsed.confidence,
                parsed.preview
            )
        }
    }
}

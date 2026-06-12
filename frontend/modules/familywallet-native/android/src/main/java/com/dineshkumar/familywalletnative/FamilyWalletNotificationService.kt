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

        Log.d("FamilyWalletNative", "Detected Whitelisted Notification: [$packageName] $title")

        // TODO: Send exact Amount/Merchant data to React Native layer for Review Queue
    }
}

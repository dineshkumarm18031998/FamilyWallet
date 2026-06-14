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
        "com.dominos.app",                        // Dominos
        "com.faasos.android",                     // Faasos / EatSure Box8 group

        // Grocery Apps
        "com.grofers.customerapp",                // Blinkit
        "com.zepto",                              // Zepto
        "com.bigbasket.mobileapp",                // BigBasket
        "com.jpl.jiomart",                        // JioMart
        "com.dunzo.user",                         // Dunzo
        "com.milkbasket.customer",                // Milk Basket

        // Recharge / Telecom / Broadband Apps
        "com.jio.myjio",                          // MyJio
        "com.myairtelapp",                        // Airtel Thanks
        "com.mventus.selfcare.activity",          // Vi App
        "com.hathway.subscriber",                 // Hathway
        "com.actcorp.subscriberapp",              // ACT Fibernet

        // DTH / OTT Apps
        "com.ryzmedia.tatasky",                   // Tata Play
        "tv.accedo.airtel.wynk",                  // Airtel Xstream
        "com.dishtv.activity",                    // Dish TV
        "com.netflix.mediaclient",                // Netflix
        "in.startv.hotstar",                      // Disney+ Hotstar

        // Utility / Bill Payment Apps
        "net.one97.paytm",                        // Paytm (bill payments)
        "in.amazon.mShop.android.shopping",       // Amazon Pay (bills)
        "com.dreamplug.androidapp",                // CRED (bill payments)

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
        
        // --- STRICT SENDER VALIDATION FOR SMS APPS ---
        if (packageName == "com.google.android.apps.messaging" || packageName == "com.samsung.android.messaging") {
            val cleanedSender = title.replace(Regex("[\\s\\-+]"), "").uppercase()
            
            // 1. Reject 10-digit Indian mobile numbers immediately
            if (cleanedSender.matches(Regex("^(91)?[6-9][0-9]{9}$"))) {
                return // Drop fake personal message
            }
            
            // 2. Must be a short code or DLT header
            val isShortCode = cleanedSender.matches(Regex("^[0-9]{5,6}$"))
            val isDltHeader = title.uppercase().matches(Regex("^[A-Z]{2}-[A-Z0-9\\-]{3,}$")) || cleanedSender.matches(Regex("^[A-Z]{6,}$"))
            
            if (!isShortCode && !isDltHeader) {
                return // Drop message
            }
            
            // 3. Must contain an allowed keyword (Check against same list)
            val allowedKeywords = listOf("SWIGGY", "ZOMATO", "EATSURE", "DOMINOS", "FAASOS", "BOX8", "BLINKIT", "ZEPTO", "BIGBASKET", "JIOMART", "DMART", "INSTAMART", "MILKBASKET", "JIO", "AIRTEL", "VODAFONE", "VI", "BSNL", "MTNL", "ACTFIBER", "ACTFIBERNET", "HATHWAY", "EXCITEL", "TATAPLAY", "TATASKY", "DISHTV", "SUNDIRECT", "D2H", "VIDEOCON", "BESCOM", "TNEB", "TANGEDCO", "MSEB", "MAHADISCOM", "BSES", "TATAPOWER", "CESC", "TORRENTPOWER", "PSPCL", "UPPCL", "WBSEDCL", "KSEB", "INDANE", "HPGAS", "BHARATGAS", "IGL", "MAHANAGARGAS", "MGL", "ADANIGAS", "BWSSB", "DJB", "BBPS", "CRED")
            
            val upperTitle = title.uppercase()
            var matchesKeyword = false
            for (keyword in allowedKeywords) {
                if (upperTitle.contains(keyword)) {
                    matchesKeyword = true
                    break
                }
            }
            
            if (!matchesKeyword) {
                return // Drop message
            }
        }
        // --------------------------------------------------

        // Pass directly to the new Ultimate Auto Detection Engine
        val parsed = ExpenseParser.parseMessage(packageName, title, fullText)

        if (parsed != null) {
            Log.d("FamilyWalletNative", "Parsed Notification: ${parsed.amount} at ${parsed.merchant} (${parsed.confidence}%)")
            // 1. Try sending event to React Native UI
            FamilywalletNativeModule.dispatchExpenseEvent(
                parsed.amount, 
                parsed.merchant, 
                parsed.category, 
                "Notification",
                parsed.confidence,
                parsed.preview
            )
            // 2. Safely write directly to SQLite Database (for when app is closed)
            FamilywalletNativeModule.saveExpenseToDatabase(
                this,
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

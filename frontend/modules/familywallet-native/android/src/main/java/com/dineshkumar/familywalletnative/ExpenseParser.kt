package com.dineshkumar.familywalletnative

import java.util.regex.Pattern

object ExpenseParser {

    data class ParsedExpense(
        val amount: Double,
        val merchant: String,
        val category: String,
        val confidence: Int,
        val preview: String
    )

    // ============================================================
    // LAYER 1: IGNORE ENGINE
    // Any message containing these words is dropped immediately,
    // regardless of sender. Protects against OTPs, promos, failed
    // transactions, and non-expense financial events.
    // ============================================================
    private val ignoreKeywords = listOf(
        // Auth / Security
        "OTP", "PASSWORD", "PIN", "ONE TIME PASSWORD", "VERIFICATION CODE", "AUTH CODE",
        // Income / Credit (not expenses)
        "SALARY", "CREDITED", "CREDIT CARD STATEMENT", "REFUND", "CASHBACK CREDITED",
        "AMOUNT CREDITED", "RECEIVED FROM",
        // Financial products (not household expenses)
        "CREDIT CARD", "LOAN", "EMI", "INSURANCE", "PREMIUM DUE", "MUTUAL FUND", "SIP",
        "STOCK", "DEMAT", "FIXED DEPOSIT", "FD MATURED",
        // Promotions / Marketing
        "PROMOTION", "PROMO CODE", "CASHBACK OFFER", "REWARD POINTS", "COUPON",
        "FLASH SALE", "MEGA SALE", "OFFER JUST FOR YOU", "WIN A",
        // Failures / Negative outcomes
        "FAILED", "FAILURE", "UNSUCCESSFUL", "DECLINED", "CANCELLED", "CANCELED",
        "NOT PROCESSED", "TRANSACTION FAILED", "PAYMENT FAILED", "ORDER CANCELLED",
        "RECHARGE FAILED", "RECHARGE UNSUCCESSFUL",
        // Pending / In-progress (not final yet)
        "PENDING", "PROCESSING", "AWAITING CONFIRMATION", "VERIFICATION PENDING",
        "IN PROGRESS", "BEING PROCESSED", "UNDER REVIEW", "INITIATED",
        // Reversals
        "PAYMENT REVERSED", "TRANSACTION REVERSED", "REFUND INITIATED", "AMOUNT REVERSED",
        "SUBSCRIPTION FAILED", "UNABLE TO PROCESS", "TECHNICAL ERROR",
        "COULD NOT BE PROCESSED", "INSUFFICIENT BALANCE", "INSUFFICIENT FUNDS"
    )

    // ============================================================
    // LAYER 2: SUCCESS ENGINE
    // At least one of these phrases must be present for a message
    // to be treated as a completed transaction.
    // ============================================================
    private val successKeywords = listOf(
        "SUCCESSFUL", "SUCCESS", "COMPLETED", "CONFIRMED", "PAID", "PAYMENT RECEIVED",
        "PAYMENT SUCCESSFUL", "ORDER CONFIRMED", "ORDER PLACED", "ORDER DELIVERED",
        "DELIVERED", "DELIVERED SUCCESSFULLY", "RECHARGE SUCCESSFUL", "RECHARGE DONE", "RECHARGED SUCCESSFULLY",
        "SUBSCRIPTION RENEWED", "PLAN ACTIVATED", "PLAN RENEWED", "TRANSACTION SUCCESSFUL",
        "APPROVED", "SETTLED", "PROCESSED SUCCESSFULLY", "BILL PAID", "BILL PAYMENT SUCCESSFUL",
        "PAYMENT DONE", "DEBITED", "AMOUNT DEBITED", "TXN SUCCESSFUL", "RECEIPT", "THANK YOU FOR SHOPPING",
        "THANK YOU FOR ORDERING", "YOUR ORDER", "PURCHASE SUCCESSFUL", "ORDER IS OUT FOR DELIVERY",
        "BOOKING CONFIRMED", "BOOKED SUCCESSFULLY"
    )

    // ============================================================
    // CATEGORIES
    // ============================================================
    const val CAT_FOOD = "Food"
    const val CAT_GROCERY = "Groceries"
    const val CAT_RECHARGE = "Recharge"
    const val CAT_DTH = "DTH"
    const val CAT_UTILITIES = "Utilities"
    const val CAT_UNKNOWN = "Unknown"

    // ============================================================
    // LAYER 3: MERCHANT DATABASES
    // Per-category lists of recognizable brand/merchant names as
    // they typically appear in SMS sender IDs, notification titles,
    // or message bodies (all matched against UPPERCASE text).
    // ============================================================

    // ---- FOOD (food delivery, dine-in chains, cafes) ----
    private val foodMerchants = listOf(
        "SWIGGY", "ZOMATO", "EATSURE", "DOMINO", "DOMINOS", "PIZZA HUT", "MCDONALD", "MCDONALDS",
        "KFC", "BURGER KING", "SUBWAY", "BOX8", "FAASOS", "EATFIT", "FRESHMENU", "MAGICPIN",
        "BEHROUZ", "OVEN STORY", "CAFE COFFEE DAY", "CCD", "STARBUCKS", "BARISTA", "CHAAYOS",
        "THIRD WAVE COFFEE", "BLUE TOKAI", "WOW MOMO", "BIRYANI BY KILO", "BEHROUZ BIRYANI",
        "RAMEN", "SUBWAYINDIA", "HALDIRAM", "BIKANERVALA", "SAGAR RATNA", "PIZZA EXPRESS",
        "TACO BELL", "LA PINOZ", "PAPA JOHNS", "KEVENTERS", "THEOBROMA", "MOJO PIZZA",
        "FRESH MENU", "SLICE", "GOOD FLIPS", "CULT KITCHEN", "EATCLUB", "DUNKIN",
        "KRISPY KREME", "WENDYS", "SMOOR", "NATURALS ICE CREAM", "AMUL ICE CREAM"
    )

    // ---- GROCERIES (quick-commerce + supermarkets) ----
    private val groceryMerchants = listOf(
        "BLINKIT", "ZEPTO", "BIGBASKET", "INSTAMART", "SWIGGY INSTAMART", "AMAZON FRESH",
        "JIOMART", "D-MART", "DMART", "RELIANCE FRESH", "RELIANCE SMART", "NATURE'S BASKET",
        "COUNTRY DELIGHT", "FLIPKART MINUTES", "DUNZO", "MILKBASKET", "SPENCER'S", "SPENCERS",
        "STAR BAZAAR", "MORE SUPERMARKET", "FOODHALL", "EASYDAY", "VIJAY SALES GROCERY",
        "GODREJ NATURE'S BASKET", "ZEPTO CAFE", "FLIPKART GROCERY", "BB DAILY", "GROFERS",
        "AMAZON PANTRY", "JIOFRESH", "APNA MART", "WOW MARKET", "AVENUE SUPERMARTS",
        "RATNADEEP", "VISHAL MEGA MART", "METRO CASH AND CARRY", "HERITAGE FRESH",
        "BAZAAR CART", "FRESH TO HOME", "LICIOUS", "TENDERCUTS", "FARMLEY", "OTIPY"
    )

    // ---- RECHARGE (mobile / broadband providers) ----
    private val rechargeMerchants = listOf(
        "JIO", "MYJIO", "AIRTEL", "AIRTEL THANKS", "VI", "VODAFONE", "VODAFONE IDEA",
        "BSNL", "MTNL", "JIOFIBER", "AIRTEL XSTREAM FIBER", "ACT FIBERNET", "ACT BROADBAND",
        "EXCITEL", "HATHWAY", "TATA PLAY FIBER", "GTPL", "AIRTEL PAYMENTS BANK",
        "JIO POSTPAID", "AIRTEL POSTPAID", "VI POSTPAID", "FREECHARGE RECHARGE",
        "PAYTM RECHARGE", "PHONEPE RECHARGE", "AMAZON RECHARGE", "MOBIKWIK RECHARGE"
    )

    // ---- DTH / OTT (TV subscriptions & streaming) ----
    private val dthMerchants = listOf(
        "TATA PLAY", "TATASKY", "TATA SKY", "DISH TV", "DISHTV", "D2H", "VIDEOCON D2H",
        "SUN DIRECT", "AIRTEL DIGITAL TV", "AIRTEL DIGITAL", "DEN NETWORKS", "HATHWAY DIGITAL",
        "NETFLIX", "AMAZON PRIME", "PRIME VIDEO", "DISNEY HOTSTAR", "HOTSTAR", "SONYLIV",
        "ZEE5", "VOOT", "JIOCINEMA", "SUN NXT", "AHA VIDEO", "APPLE TV", "YOUTUBE PREMIUM",
        "SPOTIFY", "GAANA", "JIOSAAVN", "WYNK MUSIC", "AUDIBLE"
    )

    // ---- UTILITIES / BILLS (electricity, water, gas, broadband, municipal) ----
    private val utilityMerchants = listOf(
        // Electricity boards (major Indian DISCOMs)
        "BESCOM", "TNEB", "TANGEDCO", "MSEB", "MAHADISCOM", "BSES", "BSES RAJDHANI",
        "BSES YAMUNA", "TATA POWER", "ADANI ELECTRICITY", "CESC", "TORRENT POWER",
        "PSPCL", "UPPCL", "WBSEDCL", "KSEB", "APSPDCL", "TSSPDCL", "JVVNL", "AVVNL",
        "PGVCL", "UGVCL", "MGVCL", "DGVCL", "GESCOM", "HESCOM", "MESCOM", "CHESCOM",
        // Gas
        "INDANE", "HP GAS", "HPCL GAS", "BHARAT GAS", "BPCL GAS", "INDRAPRASTHA GAS",
        "IGL", "MAHANAGAR GAS", "MGL", "ADANI GAS", "ADANI TOTAL GAS",
        // Water
        "BWSSB", "DJB", "DELHI JAL BOARD", "CMWSSB", "HMWSSB", "PMC WATER",
        // Broadband / Landline (non-mobile ISPs not already in recharge list)
        "BSNL BROADBAND", "MTNL BROADBAND", "RAILWIRE", "SPECTRA", "NETPLUS", "WIFI DABBA",
        // Generic bill aggregators / payment apps showing bill payments
        "BBPS", "BHARAT BILL PAY", "CRED BILL PAY", "PAYTM BILL PAY", "PHONEPE BILL PAY",
        "GOOGLE PAY BILL", "AMAZON PAY BILL"
    )

    // ============================================================
    // LAYER 4: CATEGORY WORDING LIBRARIES
    // Used as fallback when no merchant name is matched directly.
    // ============================================================
    private val foodWords = listOf(
        "ORDER", "FOOD", "MEAL", "RESTAURANT", "DELIVERY", "DELIVERED YOUR ORDER",
        "TABLE BOOKING", "DINE", "TAKEAWAY", "TAKE AWAY", "CAFE", "BISTRO",
        "FOOD ORDER", "YOUR MEAL", "KITCHEN", "BIRYANI", "PIZZA", "BURGER"
    )

    private val groceryWords = listOf(
        "GROCERY", "GROCERIES", "BASKET", "CART", "VEGETABLES", "FRUITS", "ESSENTIALS",
        "DAIRY", "STAPLES", "SUPERMARKET", "MART ORDER", "GROCERY ORDER", "PANTRY",
        "FRESH PRODUCE", "HOUSEHOLD ITEMS", "10 MINUTE DELIVERY", "QUICK DELIVERY"
    )

    private val rechargeWords = listOf(
        "RECHARGE", "TOPUP", "TOP-UP", "TOP UP", "PLAN", "DATA PACK", "VALIDITY",
        "PREPAID", "POSTPAID BILL", "MOBILE RECHARGE", "BROADBAND RECHARGE",
        "UNLIMITED DATA", "TALKTIME", "SIM", "NETWORK PLAN", "JIO NUMBER", "AIRTEL NUMBER"
    )

    private val dthWords = listOf(
        "SUBSCRIPTION", "CHANNEL PACK", "DTH", "TV PACK", "DTH RECHARGE", "SET TOP BOX",
        "STB", "VIEWING PERIOD", "PACKAGE RENEWED", "STREAMING PLAN", "MEMBERSHIP RENEWED",
        "ANNUAL PLAN", "MONTHLY PLAN ACTIVATED"
    )

    private val utilityWords = listOf(
        "ELECTRICITY BILL", "POWER BILL", "WATER BILL", "GAS BILL", "GAS CYLINDER",
        "LPG", "LPG BOOKING", "LPG CYLINDER", "BROADBAND BILL", "INTERNET BILL",
        "LANDLINE BILL", "UTILITY BILL", "BILL PAYMENT", "BBPS PAYMENT", "ELECTRICITY PAYMENT",
        "MUNICIPAL TAX", "PROPERTY TAX", "WATER TAX", "CONSUMER NUMBER", "BILL AMOUNT",
        "DUE AMOUNT", "ENERGY BILL", "CYLINDER DELIVERED", "CYLINDER BOOKED"
    )

    // ============================================================
    // MAIN PARSER
    // ============================================================
    fun parseMessage(packageName: String, title: String, text: String): ParsedExpense? {
        val upperText = text.uppercase()
        val upperTitle = title.uppercase()
        val upperPackage = packageName.uppercase()

        // 1. IGNORE ENGINE (Failure, Pending, General Ignores)
        if (ignoreKeywords.any { upperText.contains(it) }) {
            return null
        }

        // 1.5. SUCCESS ENGINE (Only process explicitly successful transactions)
        if (!successKeywords.any { upperText.contains(it) }) {
            return null
        }

        // 2. AMOUNT EXTRACTION
        // Try multiple patterns in order of reliability. First match wins.
        val amountPatterns = listOf(
            // Standard: "Rs. 500", "INR 500.00", "₹500"
            Regex("(?i)(?:Rs\\.?|INR|₹)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)"),
            // Labeled fields without currency symbol: "Plan Name : 19.0", "Amount: 500",
            // "Recharge of 199", "Bill Amount: 850", "Due Amount: 1200"
            Regex("(?i)(?:Plan Name|Amount|Recharge(?: of)?|Total|Bill Amount|Due Amount|Paid)\\s*:?\\s*(?:Rs\\.?|INR|₹)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)"),
            // Trailing currency: "500 Rs", "500.00 INR"
            Regex("(?i)([0-9,]+(?:\\.[0-9]{1,2})?)\\s*(?:Rs\\.?|INR|₹)")
        )

        var amount: Double? = null
        for (pattern in amountPatterns) {
            val match = pattern.find(text)
            if (match != null) {
                amount = match.groupValues[1].replace(",", "").toDoubleOrNull()
                if (amount != null && amount > 0) break
            }
        }
        if (amount == null || amount <= 0) return null

        // 3. MERCHANT & CATEGORY MATCHING ENGINE
        var detectedMerchant = "Unknown"
        var detectedCategory = CAT_UNKNOWN
        var confidence = 0

        // Helper to check all DBs
        fun checkMerchants(source: String): Boolean {
            foodMerchants.find { source.contains(it) }?.let { detectedMerchant = it; detectedCategory = CAT_FOOD; return true }
            groceryMerchants.find { source.contains(it) }?.let { detectedMerchant = it; detectedCategory = CAT_GROCERY; return true }
            rechargeMerchants.find { source.contains(it) }?.let { detectedMerchant = it; detectedCategory = CAT_RECHARGE; return true }
            dthMerchants.find { source.contains(it) }?.let { detectedMerchant = it; detectedCategory = CAT_DTH; return true }
            utilityMerchants.find { source.contains(it) }?.let { detectedMerchant = it; detectedCategory = CAT_UTILITIES; return true }
            return false
        }

        // Layer 1 & 2: Title Match (Bank Name or Direct Merchant Name)
        if (checkMerchants(upperTitle)) {
            confidence = 100
        } 
        // UPI Detection Engine ("Paid Rs X to Y")
        // Check if the package is actually a UPI app, NOT Google Messages
        else if (upperPackage.contains("PAISA") || upperPackage.contains("PHONEPE") || upperPackage.contains("PAYTM")) {
            val paidToRegex = Regex("(?i)paid (?:.*? )?to (.*)")
            val paidMatch = paidToRegex.find(text)
            if (paidMatch != null) {
                val receiver = paidMatch.groupValues[1].uppercase()
                if (checkMerchants(receiver)) {
                    confidence = 100
                } else {
                    return null // Personal transfer, ignore.
                }
            } else {
                return null // Unrecognized UPI format
            }
        }
        // Layer 4: Keyword Match inside text if Sender is generic
        else if (checkMerchants(upperText)) {
            confidence = 90
        }
        // Fallback: Check Wording Libraries
        else {
            when {
                foodWords.any { upperText.contains(it) } -> { detectedCategory = CAT_FOOD; confidence = 50 }
                groceryWords.any { upperText.contains(it) } -> { detectedCategory = CAT_GROCERY; confidence = 50 }
                rechargeWords.any { upperText.contains(it) } -> { detectedCategory = CAT_RECHARGE; confidence = 50 }
                dthWords.any { upperText.contains(it) } -> { detectedCategory = CAT_DTH; confidence = 50 }
                utilityWords.any { upperText.contains(it) } -> { detectedCategory = CAT_UTILITIES; confidence = 50 }
                else -> return null // No merchant, no category -> Ignore
            }
        }

        // 5. Build Result
        val preview = text.take(100)
        
        // Capitalize merchant nicely (e.g. "SWIGGY" -> "Swiggy")
        val niceMerchant = detectedMerchant.lowercase().replaceFirstChar { it.uppercase() }

        return ParsedExpense(amount, niceMerchant, detectedCategory, confidence, preview)
    }
}

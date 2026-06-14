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

    // Ignore Engine Rules
    private val ignoreKeywords = listOf(
        "OTP", "PASSWORD", "PIN", "SALARY", "CREDITED", "CREDIT CARD", "LOAN",
        "EMI", "INSURANCE", "MUTUAL FUND", "STOCK", "PROMOTION", "CASHBACK", "REWARD",
        "FAILED", "FAILURE", "UNSUCCESSFUL", "DECLINED", "CANCELLED", "CANCELED", 
        "PENDING", "PROCESSING", "AWAITING CONFIRMATION", "VERIFICATION PENDING", 
        "IN PROGRESS", "BEING PROCESSED", "UNDER REVIEW", "PAYMENT REVERSED", 
        "TRANSACTION REVERSED", "RECHARGE FAILED", "ORDER FAILED", "SUBSCRIPTION FAILED", 
        "UNABLE TO PROCESS", "TECHNICAL ERROR", "COULD NOT BE PROCESSED"
    )

    // Success Engine Rules
    private val successKeywords = listOf(
        "SUCCESSFUL", "COMPLETED", "CONFIRMED", "PAID", "PAYMENT RECEIVED", 
        "ORDER CONFIRMED", "ORDER DELIVERED", "RECHARGE SUCCESSFUL", 
        "SUBSCRIPTION RENEWED", "PLAN ACTIVATED", "TRANSACTION SUCCESSFUL", 
        "APPROVED", "SETTLED", "PROCESSED SUCCESSFULLY"
    )
    // Categories
    const val CAT_FOOD = "Food"
    const val CAT_GROCERY = "Groceries"
    const val CAT_RECHARGE = "Recharge"
    const val CAT_DTH = "DTH"
    const val CAT_UNKNOWN = "Unknown"

    // Merchant Databases
    private val foodMerchants = listOf("SWIGGY", "ZOMATO", "EATSURE", "DOMINO", "PIZZA HUT", "MCDONALD", "KFC", "BURGER KING", "SUBWAY", "BOX8", "FAASOS", "EATFIT", "FRESHMENU", "MAGICPIN", "BEHROUZ", "OVEN STORY")
    private val groceryMerchants = listOf("BLINKIT", "ZEPTO", "BIGBASKET", "INSTAMART", "AMAZON FRESH", "JIOMART", "D-MART", "RELIANCE FRESH", "NATURE'S BASKET", "COUNTRY DELIGHT", "FLIPKART MINUTES", "DUNZO")
    private val rechargeMerchants = listOf("JIO", "AIRTEL", "VI", "VODAFONE", "BSNL")
    private val dthMerchants = listOf("TATA PLAY", "DISH TV", "D2H", "SUN DIRECT", "AIRTEL DIGITAL")

    // Wording Libraries
    private val foodWords = listOf("ORDER", "FOOD", "MEAL", "RESTAURANT", "DELIVERY")
    private val groceryWords = listOf("GROCERY", "BASKET", "CART", "VEGETABLES", "FRUITS", "ESSENTIALS")
    private val rechargeWords = listOf("RECHARGE", "TOPUP", "PLAN", "DATA PACK", "VALIDITY")
    private val dthWords = listOf("SUBSCRIPTION", "CHANNEL PACK", "DTH", "TV PACK")

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
        val amountRegex = Regex("(?i)(?:Rs\\.?|INR|₹)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)")
        val matchResult = amountRegex.find(text)
        val amount = matchResult?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull() ?: return null

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

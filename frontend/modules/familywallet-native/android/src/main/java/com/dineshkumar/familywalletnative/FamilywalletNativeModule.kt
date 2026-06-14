package com.dineshkumar.familywalletnative

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FamilywalletNativeModule : Module() {
  
  companion object {
    var instance: FamilywalletNativeModule? = null

    fun dispatchExpenseEvent(amount: Double, merchant: String, category: String, source: String, confidence: Int, preview: String) {
      instance?.sendEvent("onExpenseDetected", mapOf(
        "amount" to amount,
        "merchant" to merchant,
        "category" to category,
        "source" to source,
        "confidence" to confidence,
        "preview" to preview
      ))
    }

    fun saveExpenseToDatabase(context: android.content.Context, amount: Double, merchant: String, category: String, source: String, confidence: Int, preview: String) {
      try {
        val dbPath = context.getDatabasePath("FamilyWallet.db")
        if (dbPath.exists()) {
            val db = android.database.sqlite.SQLiteDatabase.openDatabase(dbPath.absolutePath, null, android.database.sqlite.SQLiteDatabase.OPEN_READWRITE)
            val id = java.util.UUID.randomUUID().toString()
            val date = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.format(java.util.Date())
            
            val timestamp = System.currentTimeMillis()
            
            val sql = "INSERT INTO review_queue (id, amount, merchant, category, date, source, status, confidence, preview, timestamp) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)"
            db.execSQL(sql, arrayOf(id, amount, merchant, category, date, source, confidence, preview, timestamp))
            db.close()
            android.util.Log.d("FamilyWalletNative", "Saved expense to DB successfully!")
        } else {
            android.util.Log.w("FamilyWalletNative", "DB not found at ${dbPath.absolutePath}")
        }
      } catch (e: Exception) {
        android.util.Log.e("FamilyWalletNative", "Failed to write to DB: ${e.message}")
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("FamilywalletNative")

    Events("onExpenseDetected")

    OnCreate {
      instance = this@FamilywalletNativeModule
    }

    OnDestroy {
      instance = null
    }

    Function("openNotificationSettings") {
      try {
        val intent = android.content.Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        this@FamilywalletNativeModule.appContext.reactContext?.startActivity(intent)
      } catch (e: Exception) {
        // Fallback to general settings
        val intent = android.content.Intent(android.provider.Settings.ACTION_SETTINGS)
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        this@FamilywalletNativeModule.appContext.reactContext?.startActivity(intent)
      }
    }
  }
}

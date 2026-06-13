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
        appContext.reactContext?.startActivity(intent)
      } catch (e: Exception) {
        // Fallback to general settings
        val intent = android.content.Intent(android.provider.Settings.ACTION_SETTINGS)
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        appContext.reactContext?.startActivity(intent)
      }
    }
  }
}

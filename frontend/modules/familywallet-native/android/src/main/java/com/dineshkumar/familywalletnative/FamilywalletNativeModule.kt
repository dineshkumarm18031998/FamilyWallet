package com.dineshkumar.familywalletnative

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FamilywalletNativeModule : Module() {
  
  companion object {
    var instance: FamilywalletNativeModule? = null

    fun dispatchExpenseEvent(amount: Double, merchant: String, category: String, source: String) {
      instance?.sendEvent("onExpenseDetected", mapOf(
        "amount" to amount,
        "merchant" to merchant,
        "category" to category,
        "source" to source
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
  }
}

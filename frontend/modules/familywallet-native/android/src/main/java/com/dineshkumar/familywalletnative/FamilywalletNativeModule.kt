package com.dineshkumar.familywalletnative

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FamilywalletNativeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FamilywalletNative")

    // Declare the event that will be sent to Javascript
    Events("onExpenseDetected")
  }
}

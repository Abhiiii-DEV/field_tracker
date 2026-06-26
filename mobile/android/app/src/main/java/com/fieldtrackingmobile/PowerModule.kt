package com.fieldtrackingmobile

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Bridges the bits of Android battery/background management that pure JS can't
 * reach: checking the Doze whitelist, firing the system "ignore battery
 * optimizations" dialog (needs a package: data URI), and deep-linking the
 * OEM-specific Auto-start screens (need an explicit component name).
 *
 * Without an exemption, OEMs (Xiaomi/Oppo/Vivo/Samsung…) kill the tracking
 * foreground service when the app is swiped away, which is what flips the user
 * to OFFLINE and leaves gaps in the route.
 */
class PowerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "PowerManagerModule"

  /** True if the app is already exempt from battery optimization (Doze whitelist). */
  @ReactMethod
  fun isIgnoringBatteryOptimizations(promise: Promise) {
    try {
      val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
      promise.resolve(pm.isIgnoringBatteryOptimizations(reactContext.packageName))
    } catch (e: Exception) {
      promise.reject("ERR_BATTERY_OPT", e)
    }
  }

  /** Fires the one-tap system dialog asking the user to exempt this app. */
  @ReactMethod
  fun requestIgnoreBatteryOptimizations(promise: Promise) {
    try {
      val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
      if (pm.isIgnoringBatteryOptimizations(reactContext.packageName)) {
        promise.resolve(true)
        return
      }
      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
        data = Uri.parse("package:${reactContext.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      // Some OEMs block the direct dialog — fall back to the settings list.
      promise.resolve(openBatteryList())
    }
  }

  /** Opens the full battery-optimization list so the user can find this app. */
  @ReactMethod
  fun openBatteryOptimizationSettings(promise: Promise) {
    promise.resolve(openBatteryList())
  }

  /** Best-effort deep-link to the OEM Auto-start / protected-apps screen. */
  @ReactMethod
  fun openAutoStartSettings(promise: Promise) {
    val components = listOf(
      // Xiaomi / MIUI
      "com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity",
      // Oppo / ColorOS
      "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
      "com.coloros.safecenter" to "com.coloros.safecenter.startupapp.StartupAppListActivity",
      "com.oppo.safe" to "com.oppo.safe.permission.startup.StartupAppListActivity",
      // Vivo
      "com.vivo.permissionmanager" to "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
      "com.iqoo.secure" to "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity",
      // Huawei / Honor
      "com.huawei.systemmanager" to "com.huawei.systemmanager.optimize.process.ProtectActivity",
      "com.huawei.systemmanager" to "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
      // Letv
      "com.letv.android.letvsafe" to "com.letv.android.letvsafe.AutobootManageActivity",
      // Samsung (device care)
      "com.samsung.android.lool" to "com.samsung.android.sm.ui.battery.BatteryActivity",
    )
    for ((pkg, cls) in components) {
      try {
        val intent = Intent().apply {
          component = ComponentName(pkg, cls)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(intent)
        promise.resolve(true)
        return
      } catch (e: Exception) {
        // Not this OEM — try the next.
      }
    }
    // No known OEM screen — fall back to this app's system settings page.
    promise.resolve(openAppDetails())
  }

  private fun openBatteryList(): Boolean = try {
    val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
    true
  } catch (e: Exception) {
    openAppDetails()
  }

  private fun openAppDetails(): Boolean = try {
    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
      data = Uri.parse("package:${reactContext.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
    true
  } catch (e: Exception) {
    false
  }
}

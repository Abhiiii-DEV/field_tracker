# Android native setup

Apply these to the native Android project that `npx react-native init` generates
(or your existing one). Paths are relative to `android/`.

## 1. Permissions + foreground service — `app/src/main/AndroidManifest.xml`

Add inside `<manifest>` (above `<application>`):

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

react-native-background-actions registers its own foreground service. Declare its
type as `location` inside `<application>`:

```xml
<service
    android:name="com.asterinet.react.bgactions.RNBackgroundActionsTask"
    android:foregroundServiceType="location"
    android:exported="false" />
```

## 2. Google Maps key — `app/src/main/AndroidManifest.xml`

Inside `<application>`:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="${GOOGLE_MAPS_API_KEY}" />
```

Then in `android/gradle.properties` (DO NOT commit a real key — use a local file /
CI secret), define:

```
GOOGLE_MAPS_API_KEY=YOUR_ANDROID_RESTRICTED_KEY
```

and surface it in `app/build.gradle`:

```gradle
android {
  defaultConfig {
    manifestPlaceholders = [GOOGLE_MAPS_API_KEY: project.findProperty("GOOGLE_MAPS_API_KEY") ?: ""]
  }
}
```

Restrict the key in Google Cloud Console to your app's package name + signing
SHA-1, and enable: Maps SDK for Android, Geocoding API.

## 3. Deep link for the tracking notification — `app/src/main/AndroidManifest.xml`

Inside the main `<activity>`:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="fieldtracking" android:host="dashboard" />
</intent-filter>
```

## 4. minSdk

Background location + foreground-service-location need `minSdkVersion >= 24`
(34+ recommended as `compileSdk`/`targetSdk`).

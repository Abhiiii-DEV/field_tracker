# iOS native setup

Apply these to the native iOS project under `ios/`.

## 1. Background modes — `ios/<App>/Info.plist`

```xml
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
</array>
```

## 2. Location usage descriptions — `Info.plist`

iOS rejects builds without clear, user-facing strings:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We use your location to show your route to your team while you work.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Background location lets the app keep sharing your route while the app is
minimised. Tracking only runs while you are signed in and stops when you sign out.</string>
```

## 3. Google Maps key — `ios/<App>/AppDelegate.mm` (or `.swift`)

```objc
#import <GoogleMaps/GoogleMaps.h>
// inside application:didFinishLaunchingWithOptions:
[GMSServices provideAPIKey:@"YOUR_IOS_RESTRICTED_KEY"];
```

Prefer loading the key from a build setting / xcconfig rather than hardcoding.
Restrict the key in Google Cloud Console to your iOS bundle ID and enable:
Maps SDK for iOS, Geocoding API.

## 4. URL scheme (deep link) — `Info.plist`

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>fieldtracking</string></array>
  </dict>
</array>
```

## 5. Pods

```sh
cd ios && pod install
```

`react-native-maps` on iOS uses Apple Maps by default; to force Google Maps,
follow the react-native-maps iOS "Google Maps" setup (adds the GoogleMaps pod and
the `provideAPIKey` call above).

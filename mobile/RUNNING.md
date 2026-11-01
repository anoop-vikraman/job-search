# Running the Tweak mobile app

The app is an [Expo](https://docs.expo.dev) (React Native) project using the **CNG / managed
workflow** — there are no committed `android/` or `ios/` folders; native projects are generated
on demand.

> **Expo Go will not work.** The app depends on native modules that are not in the Expo Go
> runtime: `react-native-mmkv`, `react-native-maps`, `expo-notifications` (push),
> `react-native-webview` (Razorpay checkout) and `@sentry/react-native`. You must run a
> **development build** (a custom dev client). `expo-dev-client` is already a dependency.

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node | 20+ (tested on 24) | |
| npm | 10+ | |
| Watchman | optional | faster file watching on macOS/Linux |
| A running backend | — | see the repo root `README.md` |

For **local** (on-machine) builds you additionally need a native toolchain:

- **Android:** Android Studio + an SDK (API 34+), a device or emulator, `JAVA_HOME` set
  (JDK 17). Enable USB debugging on a physical device.
- **iOS (macOS only):** Xcode + CocoaPods (`sudo gem install cocoapods`), a simulator or a
  provisioned device.

If you don't have the native toolchains, use **EAS cloud builds** (section 4) — they build on
Expo's servers and hand you an installable artifact.

---

## 2. Install dependencies

```bash
cd mobile
npm install
```

---

## 3. Point the app at your backend

The API base URL comes from `mobile/utils/config.ts`, which reads `EXPO_PUBLIC_API_URL` and
falls back to the hosted Cloud Run URL. For local development, override it.

Create `mobile/.env` (Expo auto-loads `EXPO_PUBLIC_*` vars):

```bash
# mobile/.env
# Physical device: use your computer's LAN IP, NOT localhost.
# Android emulator: use http://10.0.2.2:8000
# iOS simulator:    http://localhost:8000 works
EXPO_PUBLIC_API_URL=http://192.168.1.50:8000
```

Find your LAN IP: `hostname -I | awk '{print $1}'` (Linux) or `ipconfig getifaddr en0` (macOS).

The backend must be reachable from the device/emulator, so bind it to all interfaces:

```bash
cd backend && venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Optional native-feature env vars (safe to omit while developing core flows):

| Variable | Used for |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Android map tiles (`react-native-maps`) |
| `EAS_PROJECT_ID` | Expo push tokens (printed by `eas init`) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry crash reporting |

---

## 4. Create the dev client

Pick **one** path.

### Path A — Local build (fastest iteration, needs native toolchain)

This generates the native project (`expo prebuild` runs automatically), compiles a debug build,
installs it on your device/emulator, and starts Metro.

```bash
cd mobile

# Android (device plugged in or emulator running)
npx expo run:android

# iOS (macOS only; simulator or device)
npx expo run:ios
```

- The first run is slow (Gradle / CocoaPods download). Later runs are fast.
- The installed app is your **dev client** — a standalone app icon on the device.
- The generated `android/` and `ios/` folders are git-ignored; delete them and re-run to
  regenerate (`npx expo prebuild --clean`).

### Path B — EAS cloud build (no local toolchain)

Build the dev client on Expo's servers, then install the artifact.

```bash
# one-time
npm install -g eas-cli
eas login
cd mobile
eas init            # creates/links an EAS project, writes projectId

# build a development client
eas build --profile development --platform android   # or: ios
```

This needs an `eas.json` with a `development` profile. If the project has none, create
`mobile/eas.json`:

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
  }
}
```

When the build finishes, EAS gives you a URL / QR code. On Android, download and install the
`.apk`. On iOS, install via the internal-distribution link (the device must be registered:
`eas device:create`).

---

## 5. Run the app in the dev client

Start the JS bundler:

```bash
cd mobile
npx expo start --dev-client
```

Then:

- **Local build (Path A):** the dev client was already installed and launched; it connects to
  Metro automatically. If not, open the dev-client app and pick the running server, or scan the
  QR code.
- **EAS build (Path B):** open the installed dev-client app → it lists dev servers on the same
  network, or scan the terminal QR code.

Useful keys in the Metro terminal: `r` reload, `j` open debugger, `m` toggle the dev menu,
`shift+a`/`shift+i` open on an Android/iOS target.

> Keep the device and your computer on the **same Wi‑Fi**. If they can't connect, run
> `npx expo start --dev-client --tunnel`.

---

## 6. Rebuild the dev client when native changes

The JS bundle hot-reloads, but a **new native build is required** whenever you:

- add/remove/upgrade a native module (anything with native code),
- change `app.config.ts` plugins, permissions, scheme, icons, or splash,
- change `expo-build-properties` / Gradle / Podfile settings.

Re-run `npx expo run:android` / `run:ios` (Path A) or `eas build` (Path B). Pure JS/TS changes
(screens, hooks, locales, styles) need only a Metro reload.

---

## 7. Quick checks (no build required)

```bash
cd mobile
npx tsc --noEmit     # type-check
npx expo lint        # lint (baseline: 0 errors)
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Network request failed / can't reach API | Use LAN IP (device) or `10.0.2.2` (Android emulator), not `localhost`; bind uvicorn to `0.0.0.0`; check firewall. |
| "main has not been registered" / runs in Expo Go | You opened Expo Go. Install and open the **dev client** instead; start Metro with `--dev-client`. |
| Map is blank on Android | Set `GOOGLE_MAPS_API_KEY` in `mobile/.env` and rebuild the dev client. |
| Push token errors | Set `EAS_PROJECT_ID` (from `eas init`) and rebuild; push needs a dev/standalone build, not the simulator. |
| Dev client can't find Metro | Same Wi‑Fi; try `--tunnel`; reopen the dev menu (`m`) and set the server URL manually. |
| Stale native build after adding a module | `npx expo prebuild --clean` then re-run `expo run:*`. |

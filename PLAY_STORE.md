# Shipping Procrastibaker to the Google Play Store

Written for someone who has never published a mobile app. Follow it top to bottom.

> **Read this first: the 14 day rule.** If your Play Console developer account is a
> **personal** account (not a registered company), Google requires you to run a
> **closed test with at least 12 testers who stay opted in for 14 continuous days**
> before you may even apply for production access. Nothing you do in code shortens
> this. Start recruiting testers on day one, or your launch slips by two weeks.
>
> Play policies change. Treat every number here as "verify in Console".

---

## Part 1: run the app on your own machine

### What you need installed
| Tool | Notes |
|---|---|
| **Android Studio** | Includes the Android SDK and an emulator. |
| **JDK 17** | Android Studio bundles one. `java -version` to check. |
| **Node + npm** | Already used for the web app. |

### Run it
```bash
npm run cap:android
```
That builds the web app, copies it into the native project, and opens Android Studio.
Then in Android Studio:

1. Wait for the Gradle sync to finish (bottom status bar).
2. Pick a device in the toolbar dropdown: either **Device Manager** to create an
   emulator, or a real phone plugged in over USB with **Developer options** and
   **USB debugging** enabled.
3. Press **Run** (the green triangle).

The app launches. **Google sign-in and push notifications will not work yet.** That is
expected until Part 2.

### If `./gradlew` fails from the terminal

Android Studio's **Run** button uses its own bundled JDK, so it usually just works.
Running `./gradlew` yourself uses whatever `java` is on your PATH, which is where these
two bite. Both are fixed in `C:/Users/<you>/.gradle/gradle.properties`, a user-level
file outside the repo. Delete it to undo.

**1. "Dependency requires at least JVM runtime version 11. This build uses a Java 8 JVM."**

An old Java is on your PATH. Point Gradle at the JDK that ships with Android Studio:
```properties
org.gradle.java.home=C:/Program Files/Android/Android Studio/jbr
```

**2. "PKIX path building failed: unable to find valid certification path"**

Antivirus HTTPS scanning (Avast, Kaspersky, ESET and friends) intercepts TLS and
re-signs it with its own root certificate. Node is usually told to trust it, which is
why `npm install` works, but **Java keeps a separate trust store** and rejects every
download.

Confirm it by checking who issued the certificate you actually receive:
```bash
echo | openssl s_client -connect repo.maven.apache.org:443 \
  -servername repo.maven.apache.org 2>/dev/null | grep "i:"
```
If the issuer is your antivirus, add its root to a copy of the JDK trust store (no
admin rights needed):
```bash
cp "/c/Program Files/Android/Android Studio/jbr/lib/security/cacerts" ~/.gradle/cacerts-avast
"/c/Program Files/Android/Android Studio/jbr/bin/keytool" -importcert \
  -alias avast-web-shield \
  -file "/c/ProgramData/Avast Software/Avast/wscert.pem" \
  -keystore ~/.gradle/cacerts-avast -storepass changeit -noprompt
```
then tell Gradle to use it:
```properties
org.gradle.jvmargs=-Xmx2048m -Djavax.net.ssl.trustStore=C:/Users/<you>/.gradle/cacerts-avast -Djavax.net.ssl.trustStorePassword=changeit
```
Turning off the antivirus HTTPS scanning also works, but this keeps it on.

### Everyday loop
After changing web code, re-run `npm run cap:android`, or just:
```bash
npm run cap:sync
```
then press Run again.

---

## Part 2: connect Firebase to the Android app

Without this the app runs but cannot sign in with Google or receive push.

1. **Firebase Console → Project settings → Your apps → Add app → Android.**
2. Package name must be exactly:
   ```
   com.procrastibaker.app
   ```
   This is permanent once published. It cannot be changed later.
3. Download **`google-services.json`** and put it at:
   ```
   android/app/google-services.json
   ```
   Gradle picks it up automatically. It is gitignored on purpose.
4. Get your **debug** signing fingerprints:
   ```bash
   cd android && ./gradlew signingReport
   ```
   On Windows use `gradlew.bat signingReport`. Copy the **SHA-1** and **SHA-256** from
   the `debug` variant.
5. Paste both into Firebase Console → Project settings → your Android app →
   **Add fingerprint**.
6. Enable **Google** under Authentication → Sign-in method (already done for web).

Re-run the app. Google sign-in should now work on the device.

---

## Part 3: create your upload key

This key proves that an update genuinely came from you.

```bash
keytool -genkey -v -keystore procrastibaker-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

It asks for two passwords and some name/organisation details. The details are not
shown publicly.

**Rules for this file:**
- Save it **outside this repository**, for example `C:/Users/you/keys/`.
- **Back it up** somewhere you will still have in two years (password manager,
  encrypted cloud folder). Not only in one laptop folder.
- Never commit it. `*.jks`, `*.keystore` and `key.properties` are already gitignored,
  and `git check-ignore` was used to confirm that.

Now create `android/key.properties` (copy `android/key.properties.example`):
```properties
storeFile=C:/Users/you/keys/procrastibaker-upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

> **What if I lose it?** Play App Signing (enabled by default for new apps) means
> Google holds the real app signing key and this is only your *upload* key. A lost
> upload key can be reset through Play support. Losing it is recoverable, but
> annoying, so still back it up.

---

## Part 4: build the file you upload

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease      # Windows: gradlew.bat bundleRelease
```

Or the shortcut: `npm run release:android`.

Output:
```
android/app/build/outputs/bundle/release/app-release.aab
```

Play wants this **`.aab`** (Android App Bundle), not an `.apk`. If `key.properties` is
missing the build still succeeds but produces an *unsigned* bundle that Play rejects.

---

## Part 5: the Play Console account

1. Go to the Google Play Console and sign up as a developer.
2. Pay the **one-time $25 registration fee**.
3. Complete **identity verification**. Personal accounts need ID, and this can take a
   few days. Do it early.

---

## Part 6: create the app listing

Play Console → **Create app**, then work through the checklist it gives you.

**Store listing**
| Field | Requirement |
|---|---|
| App name | 30 characters |
| Short description | 80 characters |
| Full description | 4000 characters |
| App icon | 512 x 512 PNG |
| Feature graphic | 1024 x 500 |
| Phone screenshots | At least 2 |

You can screenshot the running app from the emulator (the camera icon in the emulator
toolbar). Take them at a clean moment: mid-bake with the oven filled reads best.

**Policy forms** (all mandatory)
- **Privacy policy URL.** The app already serves one. Use your deployed URL:
  `https://procrastibaker-d3c13-40511.web.app/privacy`
- **Data safety.** Declare what you collect. Be accurate: account email, username,
  study session data, and analytics. You use Firebase Auth, Firestore, FCM and
  PostHog. Under-declaring here gets apps pulled.
- **Content rating** questionnaire.
- **Target audience.** See the warning below.
- **Ads:** declare none, which is currently true.

> **Think carefully about target audience.** A study app attracts under-18s. If you
> select an audience that includes **under 13**, you enter Google Play Families policy,
> which brings much stricter rules on data collection, ads and content. Given the app
> has friends, gifting and free-text feedback, targeting **13+** is far simpler to
> comply with.

---

## Part 7: release tracks

Go in this order. Do not jump straight to production.

1. **Internal testing.** Up to 100 testers, available in minutes. Use this to confirm
   the *signed* build actually works, especially Google sign-in.
2. **Closed testing.** This is where the **12 testers for 14 continuous days**
   requirement is satisfied for personal accounts. Testers must opt in with the
   Google account they use on their phone and stay opted in.
3. **Production.** Apply for access once the closed test requirement is met, then roll
   out. Consider a staged rollout (for example 20%) so a bad build does not reach
   everyone at once.

---

## Part 8: the mistake almost everyone makes

Once Play App Signing is active, Play Console shows a **different** SHA-1 and SHA-256
than your local keystore, under:

**Play Console → your app → Test and release → Setup → App signing**

You must **also add those fingerprints to Firebase** (same place as Part 2, step 5).

If you skip this: Google sign-in works perfectly in your local build and fails for
every single person who installs from the Play Store, because the app they receive is
signed with Google's key, not yours. It is a confusing failure because nothing in your
code is wrong.

---

## Part 9: shipping an update

1. Change code.
2. Bump the version. Play refuses any upload whose `versionCode` is not strictly
   higher than every build already uploaded, and numbers can never be reused:
   ```bash
   npm run release:bump            # versionCode + 1
   npm run release:bump -- 1.2.0   # versionCode + 1 and set versionName
   ```
3. Rebuild the bundle (Part 4) and upload it to a track.

---

## Quick reference

```bash
npm run cap:android      # build + open Android Studio
npm run cap:sync         # rebuild web and copy into native
npm run assets:generate  # regenerate icons and splash from resources/
npm run release:bump     # bump versionCode
npm run release:android  # build the signed .aab
```

| File | Purpose | Committed? |
|---|---|---|
| `android/app/google-services.json` | Firebase config for Android | No |
| `android/key.properties` | Signing credentials | No |
| `*.jks` | Your upload keystore | No, and keep a backup |
| `resources/icon.png` | Source for generated icons | Yes |

## Still to do before launch
- [ ] Add `google-services.json`
- [ ] Add debug SHA-1 and SHA-256 to Firebase
- [ ] Create and back up the upload keystore
- [ ] Deploy the latest web build, rules and Cloud Functions
- [ ] Recruit 12 closed testers (start early)
- [ ] Add the Play App Signing SHA fingerprints to Firebase
- [ ] Restore error monitoring (the Sentry trial expired)

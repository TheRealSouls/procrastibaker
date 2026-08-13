// Bumps the Android versionCode (and optionally versionName) in
// android/app/build.gradle.
//
// Play rejects any upload whose versionCode is not strictly higher than every
// build already uploaded, and it can never be reused or lowered. Forgetting this
// is the most common first-upload failure, so it gets a script.
//
//   npm run release:bump              -> versionCode + 1, versionName untouched
//   npm run release:bump -- 1.2.0     -> versionCode + 1, versionName = 1.2.0
import { readFileSync, writeFileSync } from "node:fs";

const GRADLE_PATH = "android/app/build.gradle";
const nextVersionName = process.argv[2];

if (nextVersionName && !/^\d+(\.\d+)*$/.test(nextVersionName)) {
  console.error(`Invalid version name "${nextVersionName}". Use digits and dots, e.g. 1.2.0`);
  process.exit(1);
}

let gradle = readFileSync(GRADLE_PATH, "utf8");

const codeMatch = gradle.match(/versionCode\s+(\d+)/);
if (!codeMatch) {
  console.error(`Could not find versionCode in ${GRADLE_PATH}`);
  process.exit(1);
}

const currentCode = Number(codeMatch[1]);
const nextCode = currentCode + 1;
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${nextCode}`);

const nameMatch = gradle.match(/versionName\s+"([^"]+)"/);
const currentName = nameMatch ? nameMatch[1] : "unknown";

if (nextVersionName) {
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${nextVersionName}"`);
}

writeFileSync(GRADLE_PATH, gradle, "utf8");

console.log(`versionCode ${currentCode} -> ${nextCode}`);
console.log(
  nextVersionName
    ? `versionName ${currentName} -> ${nextVersionName}`
    : `versionName ${currentName} (unchanged)`,
);

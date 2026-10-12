/**
 * Signs release builds with our own key so every APK can update the previous one in place.
 * Reads the keystore from FETTLE_* env vars (set by the release workflow); without them
 * the build falls back to the debug key, so local builds still work.
 */
const { withAppBuildGradle } = require("expo/config-plugins");

const SIGNING = `
        release {
            if (System.getenv("FETTLE_KEYSTORE_PATH")) {
                storeFile file(System.getenv("FETTLE_KEYSTORE_PATH"))
                storePassword System.getenv("FETTLE_KEYSTORE_PASSWORD")
                keyAlias System.getenv("FETTLE_KEY_ALIAS")
                keyPassword System.getenv("FETTLE_KEY_PASSWORD")
            }
        }`;

module.exports = (config) =>
  withAppBuildGradle(config, (c) => {
    let gradle = c.modResults.contents;
    if (gradle.includes("FETTLE_KEYSTORE_PATH")) return c;
    if (!/signingConfigs\s*\{/.test(gradle)) throw new Error("android-release-signing: signingConfigs block not found");
    gradle = gradle.replace(/signingConfigs\s*\{/, (m) => m + SIGNING);
    // Point the release build type at the new config when a keystore is provided.
    const releaseDebug = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!releaseDebug.test(gradle)) throw new Error("android-release-signing: release signingConfig not found");
    gradle = gradle.replace(releaseDebug, '$1signingConfig System.getenv("FETTLE_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug');
    c.modResults.contents = gradle;
    return c;
  });

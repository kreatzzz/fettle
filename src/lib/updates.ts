/**
 * Android self-update from GitHub Releases. The release workflow attaches a signed
 * APK to every tagged release; we compare the latest tag with the installed version,
 * download the APK and hand it to Android's installer, which replaces the app in
 * place (same signing key, so data is kept). Not available on iOS or web.
 */
import * as Application from 'expo-application';
import { Directory, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

const REPO = 'kreatzzz/fettle';

export type Update = { version: string; url: string; notes: string };

export const updatesSupported = Platform.OS === 'android';
export const installedVersion = Application.nativeApplicationVersion ?? '0.0.0';

const parts = (v: string) => v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);

function isNewer(candidate: string, current: string) {
  const a = parts(candidate);
  const b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

/** The latest release if it is newer than this install, else null. Fails quietly. */
export async function checkForUpdate(): Promise<Update | null> {
  if (!updatesSupported) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const rel = (await res.json()) as { tag_name?: string; body?: string; assets?: { name: string; browser_download_url: string }[] };
    const asset = rel.assets?.find((a) => a.name.endsWith('.apk'));
    if (!rel.tag_name || !asset || !isNewer(rel.tag_name, installedVersion)) return null;
    // Only ever download from this repo's releases.
    if (!asset.browser_download_url.startsWith(`https://github.com/${REPO}/releases/download/`)) return null;
    return { version: rel.tag_name.replace(/^v/, ''), url: asset.browser_download_url, notes: (rel.body ?? '').trim() };
  } catch {
    return null;
  }
}

/** Download the APK and open Android's installer. Resolves when the user returns to the app. */
export async function installUpdate(update: Update) {
  const dir = new Directory(Paths.cache, 'updates');
  if (dir.exists) dir.delete();
  dir.create();
  const apk = await File.downloadFileAsync(update.url, dir);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: apk.contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}

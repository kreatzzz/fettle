import { router, type Href } from 'expo-router';

/** Back if there's history (normal push), else go to `fallback` (deep link or web refresh). */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * Progress lives in the browser's own storage. Safari's engine erases a
 * site's saved data after seven days in which the browser was used but the
 * site was not visited. That covers Safari on a Mac and every browser on an
 * iPhone or iPad, which all run on Safari's engine. A site added to the Home
 * Screen is exempt.
 */
interface NavLike {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
}

export function forgetfulBrowser(nav: NavLike = navigator, standaloneMode = installed()): boolean {
  const ua = nav.userAgent;
  // An iPad says it is a Mac; the touch points give it away.
  const ios = /iPad|iPhone|iPod/.test(ua) || (nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1);
  const safari = /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg\/|OPR\/|Android/.test(ua);
  if (!ios && !safari) return false;
  return !(nav.standalone === true || standaloneMode);
}

function installed(): boolean {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches === true;
  } catch {
    return false;
  }
}

export const FORGETFUL_SHORT = 'Grown-ups: this browser can erase progress after a week without playing. Better: Chrome, Edge or Firefox on a computer.';
export const FORGETFUL_LONG =
  'This browser (Safari, or any browser on an iPhone or iPad) erases a site\'s saved data after seven days in which the browser was used but the game was not opened. A child who skips a week can lose everything. Play in Chrome, Edge or Firefox on a computer, where progress stays. If you stay with this browser, save a backup file after each session; on an iPhone or iPad, adding the game to the Home Screen also keeps the progress.';

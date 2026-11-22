import { useCallback, useSyncExternalStore } from 'react';

const PRIVACY_STORAGE_KEY = 'budget-app:hide-amounts';
const PRIVACY_EVENT_NAME = 'budget-app:privacy-change';

function getSnapshot(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(PRIVACY_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(PRIVACY_EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(PRIVACY_EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}

export function setPrivacyMask(hidden: boolean): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(PRIVACY_STORAGE_KEY, String(hidden));
    window.dispatchEvent(new CustomEvent(PRIVACY_EVENT_NAME));
  } catch {
    // Ignore storage write failures
  }
}

/**
 * Synchronizes the user-persisted "Hide Amounts" privacy mode across all widgets (§6.1, §10.2).
 */
export function usePrivacyMask(): {
  isHidden: boolean;
  togglePrivacy: () => void;
  setHidden: (hidden: boolean) => void;
} {
  const isHidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const togglePrivacy = useCallback(() => {
    setPrivacyMask(!getSnapshot());
  }, []);

  const setHidden = useCallback((hidden: boolean) => {
    setPrivacyMask(hidden);
  }, []);

  return { isHidden, togglePrivacy, setHidden };
}

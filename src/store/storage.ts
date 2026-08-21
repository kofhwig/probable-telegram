import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORE_KEY } from '../domain/constants';
import { hydrate } from '../domain/model';
import type { Portfolio } from '../domain/types';

/**
 * Same key and same JSON shape as the HTML prototype, so a portfolio exported
 * from there imports here untouched.
 */
export async function loadPortfolio(): Promise<Portfolio | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return hydrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced at 220ms, matching the prototype — typing a price should not thrash disk. */
export function savePortfolio(S: Portfolio, onError?: () => void): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(S));
    } catch {
      onError?.();
    }
  }, 220);
}

/** Flushes any pending debounce — used when the app goes to the background. */
export async function flushSave(S: Portfolio): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(S));
  } catch {
    /* nothing we can do from here */
  }
}

export async function clearPortfolio(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

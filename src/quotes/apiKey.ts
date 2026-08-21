import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'bloom.finnhub.key';

/**
 * The API key lives in the keychain / keystore rather than in the portfolio
 * JSON, so exporting a portfolio never leaks it. SecureStore has no web
 * implementation, so the web preview simply runs without a key.
 */
export async function getApiKey(): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  try {
    return (await SecureStore.getItemAsync(KEY)) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function setApiKey(value: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (value) await SecureStore.setItemAsync(KEY, value);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* a locked keystore is not worth crashing over */
  }
}

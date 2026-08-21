/**
 * The domain tests are pure functions over dates, so pin "today" — otherwise a
 * run that straddles midnight UTC produces different history windows.
 */
jest.useFakeTimers({ now: new Date('2026-03-17T12:00:00Z'), doNotFake: ['nextTick'] });

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Haptics and the keychain are native-only; the store calls both.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

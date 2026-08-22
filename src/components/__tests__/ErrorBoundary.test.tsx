import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { STORE_KEY } from '../../domain/constants';
import { ErrorBoundary } from '../ErrorBoundary';

/** Throws on the first render of each mount, so "try again" can succeed. */
function Flaky({ throwing }: { throwing: { current: boolean } }) {
  if (throwing.current) throw new Error('bad portfolio');
  return <Text>the app</Text>;
}

beforeEach(() => {
  AsyncStorage.clear();
  // React logs the caught error; the test is about the recovery, not the noise
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore?.();
});

describe('the error boundary', () => {
  it('shows a way out instead of a blank screen', () => {
    const throwing = { current: true };
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Flaky throwing={throwing} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'bad portfolio' }));
  });

  it('remounts the app when the failure was transient', () => {
    const throwing = { current: true };
    render(
      <ErrorBoundary>
        <Flaky throwing={throwing} />
      </ErrorBoundary>
    );

    throwing.current = false;
    fireEvent.press(screen.getByText('Try again'));

    expect(screen.getByText('the app')).toBeTruthy();
  });

  /**
   * The portfolio is written to disk before anything draws it, so a file that
   * breaks a screen breaks it again on every launch. Clearing it is the only
   * way back, and it has to be reachable from the failure itself.
   */
  it('can clear the saved portfolio that caused the failure', async () => {
    await AsyncStorage.setItem(STORE_KEY, '{"holdings":[{"price":"boom"}]}');
    const throwing = { current: true };
    render(
      <ErrorBoundary>
        <Flaky throwing={throwing} />
      </ErrorBoundary>
    );

    throwing.current = false;
    fireEvent.press(screen.getByText('Clear saved data and start over'));

    await waitFor(async () => expect(await AsyncStorage.getItem(STORE_KEY)).toBeNull());
    await waitFor(() => expect(screen.getByText('the app')).toBeTruthy());
  });
});

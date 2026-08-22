import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { clearPortfolio } from '../store/storage';
import { C, F, R } from '../theme/tokens';

interface Props {
  children: React.ReactNode;
  /** Called with anything caught, so tests and future logging can see it. */
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
  /** Bumped to remount the tree, so recovery does not need a process restart. */
  generation: number;
}

/**
 * Last line of defence around the whole app.
 *
 * A render that throws used to take the screen to black with no way back: the
 * portfolio is written to disk before anything draws it, so a file that breaks
 * a screen broke it again on every launch. Here the throw becomes a screen with
 * two ways out — try again, or drop the saved portfolio and start clean.
 *
 * Deliberately built from plain views: no gradients, no fonts to load, nothing
 * that could throw a second time on the way to showing the first failure.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, generation: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  private retry = () => {
    this.setState((s) => ({ error: null, generation: s.generation + 1 }));
  };

  private startOver = () => {
    // Fire and forget: the remount reloads from storage either way, and a
    // storage that refuses to clear must not leave us stuck on this screen.
    clearPortfolio().finally(this.retry);
  };

  render() {
    const { error, generation } = this.state;
    if (!error) {
      return <React.Fragment key={generation}>{this.props.children}</React.Fragment>;
    }

    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Bloom could not draw this screen. Your portfolio is still on the device — try again first.
          If it keeps happening, the saved data is the likely cause and starting over will clear it.
        </Text>
        <Text style={styles.detail} numberOfLines={3}>
          {String(error?.message || error)}
        </Text>
        <Pressable accessibilityRole="button" onPress={this.retry} style={styles.btn}>
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={this.startOver} style={[styles.btn, styles.danger]}>
          <Text style={[styles.btnText, { color: C.danger }]}>Clear saved data and start over</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bgMid, justifyContent: 'center', paddingHorizontal: 28 },
  title: { color: C.text, fontFamily: F.serif, fontSize: 26, marginBottom: 12 },
  body: { color: C.dim, fontFamily: F.sansMed, fontSize: 14, lineHeight: 21, marginBottom: 14 },
  detail: { color: C.dimmer, fontFamily: F.mono, fontSize: 11, lineHeight: 16, marginBottom: 22 },
  btn: {
    paddingVertical: 15,
    borderRadius: R.btn,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,.08)',
    borderWidth: 1,
    borderColor: C.lineHi,
    marginBottom: 10,
  },
  danger: { backgroundColor: C.dangerBg, borderColor: C.dangerLine },
  btnText: { color: C.text, fontFamily: F.sansHeavy, fontSize: 15 },
});

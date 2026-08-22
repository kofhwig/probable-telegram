import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  useFonts,
} from '@expo-google-fonts/newsreader';
import { DarkTheme, Redirect, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { ToastProvider } from '../src/components/Toast';
import { SheetProvider } from '../src/sheets/SheetHost';
import { PortfolioProvider, usePortfolio } from '../src/store/PortfolioContext';
import { C } from '../src/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** React Navigation paints its own ground behind every scene; make it ours. */
const BLOOM_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: C.bgMid,
    card: C.bgMid,
    text: C.text,
    primary: C.pink,
    border: C.line,
  },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_600SemiBold,
  });

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider value={BLOOM_THEME}>
          {/* Outside the store on purpose: recovering remounts everything below it,
              which is what makes "start over" able to rescue an unopenable file. */}
          <ErrorBoundary>
            {/* Toast sits outside the store because the store's actions announce through it,
                and the sheet portal sits inside it so sheet content keeps the store. */}
            <ToastProvider>
              <PortfolioProvider>
                <BottomSheetModalProvider>
                  <SheetProvider>
                    <Gate />
                    <StatusBar style="light" />
                  </SheetProvider>
                </BottomSheetModalProvider>
              </PortfolioProvider>
            </ToastProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Onboarding is a screen, not a tab: until a portfolio exists there is nothing
 * for Home, Portfolio or Insights to show.
 */
function Gate() {
  const { S, ready } = usePortfolio();
  const pathname = usePathname();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={styles.root} />;
  if (!S.onboarded && pathname !== '/welcome') return <Redirect href="/welcome" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bgMid },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="holding/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgMid },
});

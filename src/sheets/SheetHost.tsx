import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Icon } from '../components/Icon';
import { ErrText, tap } from '../components/ui';
import { C, F, R } from '../theme/tokens';
import { AddEditSheet, PricesSheet, TradeSheet } from './HoldingSheets';
import { AlertsSheet, SearchSheet } from './InfoSheets';
import { CashSheet, GoalSheet, LogSheet, TxSheet } from './MoneySheets';
import { DataSheet, ResetSheet, SettingsSheet } from './SettingsSheets';

export type SheetSpec =
  | { name: 'add' }
  | { name: 'edit'; id: string }
  | { name: 'trade'; id: string; side: 'buy' | 'sell' }
  | { name: 'cash' }
  | { name: 'log' }
  | { name: 'prices'; id?: string }
  | { name: 'goal' }
  | { name: 'search' }
  | { name: 'alerts' }
  | { name: 'tx'; id: string }
  | { name: 'settings' }
  | { name: 'data' }
  | { name: 'reset' };

interface SheetApi {
  open(spec: SheetSpec): void;
  close(): void;
}

const Ctx = createContext<SheetApi>({ open: () => {}, close: () => {} });

export function useSheet() {
  return useContext(Ctx);
}

function Backdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.62} pressBehavior="close" />;
}

function SheetGround({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[style, styles.bg]}>
      <LinearGradient colors={[C.sheetTop, C.sheetBottom]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

function Background({ style }: BottomSheetBackgroundProps) {
  return <SheetGround style={style} />;
}

function Handle() {
  return (
    <View style={styles.handleArea}>
      <View style={styles.grabber} />
    </View>
  );
}

/**
 * Every sheet shares this frame: title, optional subtitle, close button, and an
 * error line above the body — the prototype's `sheetShell`.
 */
/** The sheet's scroller belongs to the sheet on native; on web it is a plain one. */
const Scroll = Platform.OS === 'web' ? ScrollView : BottomSheetScrollView;

export function SheetShell({
  title,
  sub,
  error,
  children,
}: {
  title: string;
  sub?: string | null;
  error?: string;
  children: React.ReactNode;
}) {
  const { close } = useSheet();
  return (
    <>
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => {
            tap();
            close();
          }}
          style={styles.closebtn}
        >
          <Icon name="x" size={15} color={C.dim} />
        </Pressable>
      </View>
      <Scroll contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ErrText>{error}</ErrText>
        {children}
      </Scroll>
    </>
  );
}

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<BottomSheetModal>(null);
  /**
   * `spec` is what to render, `showing` is whether the sheet is up. They are
   * separate so the content survives the closing animation — and so present and
   * dismiss are driven by state rather than by an imperative call racing the
   * state update that a sheet's own submit button just made.
   */
  const [spec, setSpec] = useState<SheetSpec | null>(null);
  const [showing, setShowing] = useState(false);
  const { height } = useWindowDimensions();

  // dismissing a modal that was never presented leaves it unable to present
  const presented = useRef(false);
  useEffect(() => {
    if (showing) {
      presented.current = true;
      ref.current?.present();
    } else if (presented.current) {
      presented.current = false;
      ref.current?.close();
      ref.current?.dismiss();
    }
  }, [showing, spec]);

  const open = useCallback((next: SheetSpec) => {
    setSpec(next);
    setShowing(true);
  }, []);

  const close = useCallback(() => setShowing(false), []);

  const api = useMemo(() => ({ open, close }), [open, close]);

  const body = spec ? <SheetBody spec={spec} /> : null;

  return (
    <Ctx.Provider value={api}>
      {children}
      {Platform.OS === 'web' ? (
        <WebSheet showing={showing} maxHeight={height * 0.88} onClose={close}>
          {body}
        </WebSheet>
      ) : (
        <BottomSheetModal
          ref={ref}
          onDismiss={() => {
            setShowing(false);
            setSpec(null);
          }}
          enableDynamicSizing
          maxDynamicContentSize={height * 0.88}
          enablePanDownToClose
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          backdropComponent={Backdrop}
          backgroundComponent={Background}
          handleComponent={Handle}
        >
          {body}
        </BottomSheetModal>
      )}
    </Ctx.Provider>
  );
}

/**
 * The web preview's stand-in for the native sheet. `@gorhom/bottom-sheet`
 * presents fine under react-native-web but will not dismiss there, which would
 * strand anyone running `expo start --web` (and the walkthrough script) behind
 * an unclosable panel. The sheet bodies and the shell are the same either way —
 * only the container differs, and only off-device.
 */
function WebSheet({
  showing,
  maxHeight,
  onClose,
  children,
}: {
  showing: boolean;
  maxHeight: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!showing) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable accessibilityLabel="Dismiss" style={[StyleSheet.absoluteFill, styles.webScrim]} onPress={onClose} />
      <Animated.View
        entering={SlideInDown.duration(280)}
        exiting={SlideOutDown.duration(220)}
        style={[styles.webSheet, { maxHeight }]}
        testID="sheet"
      >
        <SheetGround style={StyleSheet.absoluteFill} />
        <Handle />
        {children}
      </Animated.View>
    </View>
  );
}

function SheetBody({ spec }: { spec: SheetSpec }) {
  switch (spec.name) {
    case 'add':
      return <AddEditSheet />;
    case 'edit':
      return <AddEditSheet id={spec.id} />;
    case 'trade':
      return <TradeSheet id={spec.id} initialSide={spec.side} />;
    case 'prices':
      return <PricesSheet only={spec.id} />;
    case 'cash':
      return <CashSheet />;
    case 'log':
      return <LogSheet />;
    case 'goal':
      return <GoalSheet />;
    case 'tx':
      return <TxSheet id={spec.id} />;
    case 'search':
      return <SearchSheet />;
    case 'alerts':
      return <AlertsSheet />;
    case 'settings':
      return <SettingsSheet />;
    case 'data':
      return <DataSheet />;
    case 'reset':
      return <ResetSheet />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  bg: {
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    borderTopWidth: 1,
    borderColor: C.lineHi,
    overflow: 'hidden',
  },
  handleArea: { alignItems: 'center', paddingTop: 8 },
  grabber: { width: 38, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.18)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: { fontFamily: F.serif, fontSize: 21, color: C.text },
  sub: { color: C.dim, fontSize: 12, fontFamily: F.sansSemi, marginTop: 2 },
  closebtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,.07)',
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 34 },
  webScrim: { backgroundColor: C.scrim },
  webSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    overflow: 'hidden',
  },
});

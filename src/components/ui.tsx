import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { C, F, R } from '../theme/tokens';

export function tap(style: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (Platform.OS === 'web') return;
  if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (style === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else Haptics.impactAsync(style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
}

/* ---------- type ---------- */

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function PageKick({ children }: { children: React.ReactNode }) {
  return <Text style={styles.pagekick}>{children}</Text>;
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.pagetitle}>{children}</Text>;
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sectiontitle, style]}>{children}</Text>;
}

/** Tabular-figure serif, used for every headline number. */
export function SerifNum({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.serifnum, style]}>{children}</Text>;
}

/* ---------- surfaces ---------- */

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({
  children,
  onPress,
  style,
  align = 'center',
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  align?: ViewStyle['alignItems'];
}) {
  const content = <View style={[styles.row, { alignItems: align }, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {content}
    </Pressable>
  );
}

export function Pill({ tone, children }: { tone: 'mint' | 'coral' | 'grey'; children: React.ReactNode }) {
  const bg = tone === 'mint' ? C.pillMintBg : tone === 'coral' ? C.pillCoralBg : C.pillGreyBg;
  const fg = tone === 'mint' ? C.mint : tone === 'coral' ? C.coral : C.dim;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={styles.bar}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 999, backgroundColor: color }} />
    </View>
  );
}

/* ---------- buttons ---------- */

export function Btn({
  label,
  onPress,
  kind = 'primary',
  style,
  disabled,
  compact,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'sec' | 'danger';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inner = (
    <Text
      style={[
        styles.btnLabel,
        compact && { fontSize: 13.5 },
        kind === 'primary' ? { color: C.onPink } : kind === 'danger' ? { color: C.danger } : { color: C.text },
      ]}
    >
      {label}
    </Text>
  );

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        compact && { paddingVertical: 13 },
        kind === 'sec' && styles.btnSec,
        kind === 'danger' && styles.btnDanger,
        disabled && { opacity: 0.45 },
        pressed && styles.pressed,
        style,
      ]}
    >
      {kind === 'primary' ? (
        <LinearGradient
          colors={[C.btnPrimaryFrom, C.btnPrimaryTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {inner}
    </Pressable>
  );
}

export function GhostBtn({ label, icon, onPress }: { label: string; icon?: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.ghostbtn, pressed && styles.pressed]}
    >
      {icon}
      <Text style={styles.ghostbtnText}>{label}</Text>
    </Pressable>
  );
}

export function IconBtn({
  children,
  onPress,
  dot,
  size = 40,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  dot?: boolean;
  size?: number;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconbtn, { width: size, height: size }, pressed && styles.pressed]}
    >
      {children}
      {dot ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

/** The `.seg` control: buy/sell, cash mode, log kind. */
export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.segBtn, on && styles.segBtnOn]}
          >
            <Text style={[styles.segText, on && { color: C.onPink }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- forms ---------- */

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  numeric,
  multiline,
  style,
  autoCapitalize,
  sheet,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hint?: string;
  numeric?: boolean;
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
  /** Inside a bottom sheet the input must be the sheet's own, or the keyboard fights the pan gesture. */
  sheet?: boolean;
}) {
  // BottomSheetTextInput exists to keep the native keyboard from fighting the
  // sheet's pan gesture; on web there is no keyboard to avoid, and it reaches
  // for a TextInputState method react-native-web does not implement.
  const Input = sheet && Platform.OS !== 'web' ? BottomSheetTextInput : TextInput;
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.dimmer}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        inputMode={numeric ? 'decimal' : 'text'}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={!numeric}
        style={[styles.input, numeric && styles.inputNum, multiline && styles.textarea]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/**
 * There is no native `<select>` in React Native, and a wheel picker would be a
 * whole extra native module for ten currencies — so the options are chips.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                tap();
                onChange(o.value);
              }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && { color: C.onPink }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function ErrText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <Text style={styles.err}>{children}</Text>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <View style={styles.empty}>{children}</View>;
}

export function EmptyText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.emptyText}>{children}</Text>;
}

export const styles = StyleSheet.create({
  eyebrow: {
    color: C.pinkDim,
    fontSize: 12,
    fontFamily: F.sansBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pagekick: { color: C.pinkDim, fontSize: 13, fontFamily: F.sansSemi },
  pagetitle: { fontFamily: F.serif, fontSize: 28, color: C.text, lineHeight: 32 },
  sectiontitle: { fontFamily: F.serif, fontSize: 19, color: C.text },
  serifnum: { fontFamily: F.serif, color: C.text, letterSpacing: -0.5 },

  card: { borderRadius: R.card, padding: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  row: {
    flexDirection: 'row',
    gap: 13,
    width: '100%',
    borderRadius: R.row,
    paddingVertical: 13,
    paddingHorizontal: 15,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  pillText: { fontSize: 13, fontFamily: F.sansBold },

  bar: { height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.07)', overflow: 'hidden' },

  btn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: R.btn,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  btnLabel: { fontSize: 15, fontFamily: F.sansHeavy },
  btnSec: { backgroundColor: 'rgba(255,255,255,.08)', borderWidth: 1, borderColor: C.lineHi },
  btnDanger: { backgroundColor: C.dangerBg, borderWidth: 1, borderColor: C.dangerLine },

  ghostbtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,.06)',
    borderWidth: 1,
    borderColor: C.lineHi,
  },
  ghostbtnText: { fontSize: 12.5, fontFamily: F.sansBold, color: C.pinkSoft },

  iconbtn: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.09)',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: C.danger,
  },

  seg: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,.05)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  segBtnOn: { backgroundColor: C.btnPrimaryFrom },
  segText: { fontSize: 13, fontFamily: F.sansBold, color: C.dim },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,.05)',
    borderWidth: 1,
    borderColor: C.line,
  },
  chipOn: { backgroundColor: C.btnPrimaryFrom, borderColor: C.btnPrimaryFrom },
  chipText: { fontSize: 13, fontFamily: F.sansSemi, color: C.dim },

  field: { marginBottom: 13 },
  fieldLabel: {
    color: C.dim,
    fontSize: 11.5,
    fontFamily: F.sansBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: R.field,
    backgroundColor: 'rgba(255,255,255,.05)',
    borderWidth: 1,
    borderColor: C.lineHi,
    color: C.text,
    fontFamily: F.sansSemi,
    fontSize: 15,
  },
  inputNum: { fontVariant: ['tabular-nums'] },
  textarea: { minHeight: 70, fontFamily: F.mono, fontSize: 13, textAlignVertical: 'top' },
  hint: { color: C.dimmer, fontSize: 11.5, fontFamily: F.sansMed, marginTop: 5, lineHeight: 17 },
  err: { color: C.danger, fontSize: 12.5, fontFamily: F.sansBold, marginBottom: 12 },

  empty: {
    borderRadius: R.card,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.lineHi,
    backgroundColor: 'rgba(255,255,255,.025)',
  },
  emptyText: {
    color: C.dim,
    fontSize: 13,
    fontFamily: F.sansMed,
    lineHeight: 20,
    textAlign: 'center',
    marginVertical: 6,
    marginBottom: 16,
  },

  num: { fontVariant: ['tabular-nums'] },
});

/** Shared tabular-figure style for any number rendered outside these helpers. */
export const numStyle = styles.num;

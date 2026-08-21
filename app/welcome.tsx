import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../src/components/Icon';
import { ScreenBackground } from '../src/components/ScreenBackground';
import { Btn, Field, Select, SerifNum } from '../src/components/ui';
import { CURRENCIES } from '../src/domain/constants';
import { usePortfolio } from '../src/store/PortfolioContext';
import { C, F } from '../src/theme/tokens';

export default function Welcome() {
  const { start } = usePortfolio();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');

  const begin = (mode: 'empty' | 'sample') => {
    start(mode, name.trim(), currency);
    router.replace('/');
  };

  return (
    <View style={styles.screen} testID="screen-welcome">
      <ScreenBackground />
      <ScrollView
        contentContainerStyle={[styles.page, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
      <View style={{ alignItems: 'center', marginBottom: 6 }}>
        <Icon name="lotus" size={46} color={C.pink} />
      </View>
      <SerifNum style={styles.title}>Bloom</SerifNum>
      <Text style={styles.blurb}>
        A portfolio tracker you keep by hand. Add what you own, update prices when you like, and watch the tree fill in.
      </Text>

      <Field label="What should it call you?" value={name} onChangeText={setName} placeholder="Your name" />
      <Select
        label="Currency"
        value={currency}
        onChange={setCurrency}
        options={Object.keys(CURRENCIES).map((k) => ({ value: k, label: `${k} ${CURRENCIES[k].trim()}` }))}
      />

      <Btn label="Start with an empty portfolio" onPress={() => begin('empty')} style={{ marginTop: 8 }} />
      <Btn kind="sec" label="Explore with a sample portfolio" onPress={() => begin('sample')} style={{ marginTop: 10 }} />

        <Text style={styles.fine}>Everything is stored on your device only.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bgMid },
  page: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22 },
  title: { fontSize: 38, textAlign: 'center', letterSpacing: 0 },
  blurb: {
    textAlign: 'center',
    color: C.dim,
    fontSize: 14,
    fontFamily: F.sansMed,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 26,
    marginHorizontal: 8,
  },
  fine: { textAlign: 'center', color: C.dimmer, fontSize: 11.5, fontFamily: F.sansMed, marginTop: 16, lineHeight: 17 },
});

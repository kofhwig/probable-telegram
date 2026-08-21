import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '../theme/tokens';
import { AmbientPetals } from './Petals';

/**
 * The prototype's `.screen` gradient with its drifting petals. Each screen
 * paints its own — navigator scenes stay mounted behind one another, so a
 * see-through screen would show the last one through it.
 */
export function ScreenBackground({ petals = true }: { petals?: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[C.bgTop, C.bgMid, C.bgBottom]}
        locations={[0, 0.7, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {petals ? <AmbientPetals /> : null}
    </View>
  );
}

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

type BackdropProps = { variant?: 'menu' | 'game' | 'result'; minimal?: boolean };

export function ArcadeBackdrop({ variant = 'menu', minimal = false }: BackdropProps) {
  const result = variant === 'result';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={result ? ['#4B087C', '#260851', '#080925'] : ['#070823', '#10113A', '#070718']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, styles.glowBlue, result && { top: '18%' }]} />
      <View style={[styles.glow, styles.glowPink, result && { top: '58%' }]} />
      <View style={[styles.glow, styles.glowViolet]} />
      {!minimal && (
        <>
          <View style={[styles.orbit, styles.orbitCyan, result && { top: '43%' }]} />
          <View style={[styles.orbit, styles.orbitPink, result && { top: '52%' }]} />
          <View style={[styles.orbit, styles.orbitBlue, result && { top: '71%' }]} />
          <Text style={[styles.sparkle, { top: '18%', right: '12%', color: colors.accentCyan }]}>✦</Text>
          <Text style={[styles.sparkle, { top: '62%', left: '6%', color: colors.accentPink }]}>✧</Text>
          <Text style={[styles.sparkle, { top: '79%', right: '11%', color: '#9C8FFF' }]}>◇</Text>
        </>
      )}
      <LinearGradient colors={['transparent', '#07051ED9']} style={styles.footerShade} />
    </View>
  );
}

type NeonButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'cyan';
  style?: ViewStyle;
  disabled?: boolean;
};
export function NeonButton({ label, onPress, kind = 'primary', style, disabled = false }: NeonButtonProps) {
  const primary = kind === 'primary';
  return (
    <TouchableOpacity
      accessibilityRole="button" accessibilityLabel={label}
      activeOpacity={0.79} disabled={disabled} onPress={onPress}
      style={[styles.buttonFrame, primary && styles.buttonFrameMain, style, disabled && { opacity: 0.55 }]}
    >
      <LinearGradient
        colors={primary ? ['#1EADFF', '#7A38FF', '#F24CD6'] : kind === 'cyan' ? ['#16D6D9', '#0D9AA8'] : ['#272C63', '#191D46']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.buttonRim}
      >
        <LinearGradient
          colors={primary ? ['#152D80', '#33166B', '#321052'] : kind === 'cyan' ? ['#22E3EC', '#1BC8D5'] : ['#192053', '#111739']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.buttonCore}
        >
          <Text style={[styles.buttonLabel, kind === 'cyan' && { color: '#071A36' }, primary && styles.buttonLabelMain]}>{label}</Text>
        </LinearGradient>
      </LinearGradient>
    </TouchableOpacity>
  );
}

type StatProps = { label: string; value: string; accent?: string };
export function GlassStat({ label, value, accent = '#FFFFFF' }: StatProps) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.28 },
  glowBlue: { backgroundColor: '#0064EE', top: '20%', left: '-50%' },
  glowPink: { backgroundColor: '#BA12EF', top: '31%', right: '-54%' },
  glowViolet: { backgroundColor: '#4029DC', bottom: '-13%', left: '-10%' },
  orbit: { position: 'absolute', height: 230, width: '120%', left: '-11%', borderRadius: 230, borderWidth: 3, borderColor: 'transparent' },
  orbitCyan: { top: '25%', borderTopColor: '#3FEAFF', borderLeftColor: '#3479FF', transform: [{ rotate: '23deg' }], shadowColor: '#20AFFF', shadowOpacity: 0.95, shadowRadius: 17, elevation: 3 },
  orbitPink: { top: '32%', borderBottomColor: '#EF42FE', borderRightColor: '#8E30FF', transform: [{ rotate: '-19deg' }], shadowColor: '#EF42FE', shadowOpacity: 0.9, shadowRadius: 19, elevation: 3 },
  orbitBlue: { top: '56%', borderTopColor: '#295BFE', transform: [{ rotate: '-30deg' }], opacity: 0.7 },
  sparkle: { position: 'absolute', fontSize: 23, textShadowRadius: 13, textShadowColor: '#28CDFF' },
  footerShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
  buttonFrame: { borderRadius: 20, overflow: 'hidden', width: '100%' },
  buttonFrameMain: { borderRadius: 26, shadowColor: '#AD43FF', shadowOpacity: 0.85, shadowRadius: 23, shadowOffset: { width: 0, height: 0 }, elevation: 9 },
  buttonRim: { padding: 2, borderRadius: 21 },
  buttonCore: { paddingVertical: 17, minHeight: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 19 },
  buttonLabel: { color: '#F3F2FF', fontWeight: '900', fontSize: 16, letterSpacing: 1.5, textAlign: 'center' },
  buttonLabelMain: { fontSize: 22, letterSpacing: 2.5, textShadowColor: '#FC7BFF', textShadowRadius: 11 },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', backgroundColor: 'rgba(11,16,46,0.82)', borderColor: 'rgba(116,144,255,0.36)', borderWidth: 1, borderRadius: 15, paddingVertical: 12, paddingHorizontal: 8 },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3, color: '#9DA6D5', marginBottom: 5 },
  statValue: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
});

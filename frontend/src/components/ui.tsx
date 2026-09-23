import { useEffect, useState } from 'react';
import { Animated, Image, Pressable, Text, View } from 'react-native';

import AppIcon from './AppIcon';
import { colors } from '../theme';

/* ---------------------------------- Dot ---------------------------------- */

export function PulseDot({ color = colors.secondary, size = 6 }: { color?: string; size?: number }) {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View className="relative" style={{ width: size, height: size }}>
      <Animated.View
        className="absolute inset-0 rounded-full"
        style={{
          backgroundColor: color,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
        }}
      />
      <View className="absolute inset-0 rounded-full" style={{ backgroundColor: color }} />
    </View>
  );
}

/* ---------------------------------- Pill --------------------------------- */

type PillTone = 'emerald' | 'cyan' | 'primary' | 'amber' | 'slate' | 'blue';

const pillClasses: Record<PillTone, string> = {
  emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
  primary: 'bg-[#182845] border-primary/30 text-primary',
  amber: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  slate: 'bg-[#162238] border-[#22324f] text-slate-300',
  blue: 'bg-blue-950/70 border-blue-500/40 text-cyan-300',
};

const pillIconColors: Record<PillTone, string> = {
  emerald: colors.accentEmerald,
  cyan: '#67e8f9',
  primary: colors.primary,
  amber: '#fbbf24',
  slate: '#cbd5e1',
  blue: '#67e8f9',
};

export function Pill({
  icon,
  children,
  tone = 'emerald',
  glowColor,
}: {
  icon?: string;
  children: React.ReactNode;
  tone?: PillTone;
  glowColor?: string;
}) {
  return (
    <View
      className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 ${pillClasses[tone]}`}
      style={glowColor ? { ...glow(glowColor, 8, 0.25) } : undefined}
    >
      {icon ? <AppIcon name={icon} size={14} color={pillIconColors[tone]} /> : null}
      <Text className="font-mono text-[10px] font-semibold uppercase tracking-wider">{children}</Text>
    </View>
  );
}

/* ------------------------------ Section label ----------------------------- */

export function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={`font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary ${className}`}>
      {children}
    </Text>
  );
}

/* ------------------------------- ProgressBar ------------------------------ */

export function ProgressBar({
  percent,
  track = '#0b1326',
  fill = '#4edea3',
  height = 10,
  glowColor = colors.secondary,
}: {
  percent: number;
  track?: string;
  fill?: string;
  height?: number;
  glowColor?: string;
}) {
  return (
    <View
      className="w-full overflow-hidden rounded-full"
      style={{ backgroundColor: track, height, borderWidth: 1, borderColor: '#233554' }}
    >
      <View
        style={{
          height: '100%',
          width: `${percent}%`,
          backgroundColor: fill,
          ...glow(glowColor, 10, 0.4),
        }}
      />
    </View>
  );
}

/* ---------------------------------- Avatar -------------------------------- */

export function Avatar({
  uri,
  size = 32,
  initial = 'T',
  ringColor = '#233554',
}: {
  uri?: string;
  size?: number;
  initial?: string;
  ringColor?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = !uri || failed;

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: '#162238',
        borderWidth: 1,
        borderColor: ringColor,
      }}
    >
      {showFallback ? (
        <Text style={{ color: colors.accentCyan, fontSize: size * 0.4, fontWeight: '700' }}>{initial}</Text>
      ) : (
        <Image source={{ uri }} style={{ width: size, height: size }} onError={() => setFailed(true)} />
      )}
    </View>
  );
}

/* ---------------------------- Divider with label --------------------------- */

export function DividerLabel({ children }: { children: React.ReactNode }) {
  return (
    <View className="my-2 flex-row items-center justify-center">
      <View className="h-px flex-1 bg-surface-container-highest" />
      <Text className="bg-surface px-4 font-mono text-[11px] uppercase tracking-wider text-text-muted">
        {children}
      </Text>
      <View className="h-px flex-1 bg-surface-container-highest" />
    </View>
  );
}

/* ---------------------------- Segmented control ---------------------------- */

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-1 rounded-xl border border-[#1e2c45] bg-[#10192b] p-1">
      {options.map((opt, i) => {
        const active = i === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(i)}
            className={`flex-1 items-center rounded-lg px-2 py-1.5 ${
              active
                ? 'border border-primary/30 bg-[#1a2842] shadow-sm'
                : 'border border-transparent'
            }`}
          >
            <Text
              className={`font-mono text-[11px] ${active ? 'font-semibold text-primary' : 'font-medium text-text-secondary'}`}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------------------------- Card ---------------------------------- */

export function Card({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: object;
}) {
  return (
    <View
      className={`rounded-xl border border-[#233554] bg-[#111c33] ${className}`}
      style={style}
    >
      {children}
    </View>
  );
}

function glow(color: string, radius: number, opacity: number) {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  };
}
import { Image, Pressable, Text, View } from 'react-native';

import AppIcon from './AppIcon';
import { ProgressBar } from './ui';
import { colors, shadow } from '../theme';
import type { ExploreCard, SellerTier, Tone } from '../types';

const tagTones: Record<Tone, string> = {
  emerald: 'border-secondary/50 text-secondary',
  cyan: 'border-accent-cyan/50 text-accent-cyan',
  primary: 'border-primary/50 text-primary',
  amber: 'border-amber-500/50 text-amber-400',
  blue: 'border-sky-400/60 bg-[#0a1b2e] text-sky-300',
};

const gradeTones: Record<'primary' | 'secondary', string> = {
  primary: 'bg-[#182845] border-primary/30 text-primary',
  secondary: 'bg-[#0e2a22] border-secondary/40 text-secondary',
};

const tierMeta: Record<SellerTier, { label: string; cls: string }> = {
  secure: { label: 'VENDEDOR SEGURO', cls: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' },
  normal: { label: 'VENDEDOR NORMAL', cls: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' },
  not_secure: { label: 'VENDEDOR NO SEGURO', cls: 'bg-red-500/10 border-red-500/40 text-red-400' },
};

function VerifiedBadge() {
  return (
    <View
      className="absolute right-1.5 top-1.5 z-10 flex-row items-center gap-1 rounded bg-[#04140c]/95 px-2 py-0.5"
      style={{ borderWidth: 1, borderColor: colors.secondary + '99', ...glow(colors.secondary, 8, 0.3) }}
    >
      <AppIcon name="verified" size={12} color={colors.accentEmerald} />
      <Text className="font-mono text-[9px] font-bold uppercase tracking-tight text-emerald-300">
        Chequeado para Compra
      </Text>
    </View>
  );
}

function TelemetryPanel({ card }: { card: ExploreCard }) {
  const t = card.telemetry;

  if (t.kind === 'verified') {
    return (
      <View className="flex flex-col gap-1.5 rounded-lg border border-secondary/30 bg-[#06271a]/70 p-2.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="task_alt" size={16} color={colors.secondary} />
            <Text className="font-mono text-[11px] font-bold uppercase tracking-tight text-secondary">
              Chequeado para Compra
            </Text>
          </View>
          {t.conditionGrade ? (
            <View className="rounded border border-secondary/40 bg-[#13233b] px-1.5 py-0.5">
              <Text className="font-mono text-[11px] font-semibold text-secondary">GRADO {t.conditionGrade}</Text>
            </View>
          ) : null}
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] text-text-secondary">
            Uso: <Text className="font-semibold text-text-primary">{t.usageType ?? '—'}</Text>
          </Text>
          <Text className="font-mono text-[11px] text-secondary">
            {t.hoursOfUse != null ? `${t.hoursOfUse} h reales` : 'Datos reales disponibles'}
          </Text>
        </View>
        {t.stressTest ? (
          <Text className="font-mono text-[10px] leading-relaxed text-text-secondary">{t.stressTest}</Text>
        ) : null}
      </View>
    );
  }

  if (t.kind === 'unverified') {
    return (
      <View className="flex flex-row items-center gap-2 rounded-lg border border-[#1b2b45] bg-[#0c1626] p-2.5">
        <AppIcon name="science" size={16} color={colors.diagnosticAmber} />
        <Text className="flex-1 text-[11px] text-text-secondary">{t.reason}</Text>
      </View>
    );
  }

  if (t.kind === 'checklist') {
    return (
      <View className="flex flex-col gap-1.5 rounded-lg border border-[#1b2b45] bg-[#0c1626] p-2.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name={t.icon} size={16} color={colors.secondary} />
            <Text className="font-mono text-[11px] font-bold uppercase tracking-tight text-secondary">
              {t.title}
            </Text>
          </View>
          <View className="rounded bg-[#13233b] border border-secondary/40 px-1.5 py-0.5">
            <Text className="font-mono text-[11px] font-semibold text-secondary">{t.pts}</Text>
          </View>
        </View>
        <View className="flex-row items-center justify-between pt-1">
          <Text className="flex-row items-center text-[11px] text-text-secondary">
            <AppIcon name="verified_user" size={14} color={colors.primary} />
            {'  '}
            {t.auditor} (Hash: {t.hash})
          </Text>
          <Text className="font-mono text-[11px] font-medium text-secondary">{t.satisfaction}</Text>
        </View>
      </View>
    );
  }
  if (t.kind === 'battery') {
    return (
      <View className="flex flex-col gap-2 rounded-lg border border-[#1b2b45] bg-[#0c1626] p-2.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="battery_charging_full" size={16} color={colors.secondary} />
            <Text className="font-mono text-[11px] font-semibold text-text-primary">{t.label}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <AppIcon name="screen_search_desktop" size={15} color={colors.secondary} />
            <Text className="font-mono text-[11px] font-medium text-secondary">{t.subRight}</Text>
          </View>
        </View>
        <ProgressBar percent={t.percent} height={6} />
      </View>
    );
  }
  if (t.kind === 'metrics') {
    return (
      <View className="flex-row gap-2">
        {t.cells.map((cell) => (
          <View
            key={cell.label}
            className="flex-1 flex-row items-center gap-2 rounded-lg border border-[#1b2b45] bg-[#0c1626] p-2"
          >
            <View className="h-7 w-7 items-center justify-center rounded-lg bg-[#15233b]">
              <AppIcon
                name={cell.icon}
                size={16}
                color={cell.tone === 'cyan' ? colors.accentCyan : colors.secondary}
              />
            </View>
            <View>
              <Text className="font-mono text-[10px] uppercase text-text-muted">{cell.label}</Text>
              <Text className="font-mono text-[11px] font-semibold text-text-primary">{cell.value}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View className="flex-row items-center justify-between rounded-lg border border-[#1b2b45] bg-[#0c1626] p-2.5">
      <View className="flex-row items-center gap-1.5">
        <AppIcon name={t.icon} size={18} color={colors.primary} />
        <Text className="text-xs text-text-secondary">{t.text}</Text>
      </View>
      <AppIcon name="verified" size={18} color={colors.secondary} />
    </View>
  );
}

export default function ProductCard({
  card,
  onPress,
  onBuy,
}: {
  card: ExploreCard;
  onPress: () => void;
  onBuy: () => void;
}) {
  const tier = card.sellerTier ? tierMeta[card.sellerTier] : null;

  return (
    <Pressable
      onPress={onPress}
      className="flex flex-col gap-3 rounded-xl border border-[#20304a] bg-[#111b2e] p-3.5"
      style={shadow.card}
    >
      <View className="flex-row gap-3">
        <View className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-[#1b273d] bg-[#0a101d]">
          {card.image ? (
            <Image source={{ uri: card.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center bg-[#131c2e]">
              <AppIcon name="hardware" size={32} color={colors.outlineVariant} />
            </View>
          )}
          {card.verified ? <VerifiedBadge /> : null}
          <View
            className={`absolute left-1.5 top-1.5 rounded border px-2 py-0.5 bg-[#090f1d]/90 ${tagTones[card.tagTone]}`}
          >
            <Text className="font-mono text-[11px] font-bold">{card.tag}</Text>
          </View>
        </View>
        <View className="min-w-0 flex-1 flex-col justify-between">
          <View>
            <View className="flex-row items-center justify-between gap-1">
              <View className={`rounded border px-1.5 py-0.5 ${gradeTones[card.gradeTone]}`}>
                <Text className="font-mono text-[10px] font-semibold tracking-wide">{card.grade}</Text>
              </View>
              <Text className="font-mono text-[11px] font-medium text-secondary">Id: #{card.id.slice(0, 6).toUpperCase()}</Text>
            </View>
            <Text className="mt-1 truncate text-sm font-semibold text-text-primary">{card.title}</Text>
            <Text className="text-xs text-text-secondary">{card.subtitle}</Text>
          </View>
          <View className="flex-row items-baseline justify-between pt-1">
            <View>
              <Text className="text-[11px] text-text-muted">{card.escrow}</Text>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-xl font-bold text-text-primary">${card.price}</Text>
                <Text className="font-mono text-[11px] text-text-secondary">{card.currency}</Text>
              </View>
            </View>
            <Pressable
              onPress={onBuy}
              className="h-9 flex-row items-center gap-1.5 rounded-lg bg-secondary px-3.5"
              style={shadow.panel}
            >
              <AppIcon name="lock" size={16} color="#002e1b" />
              <Text className="text-xs font-semibold text-[#002e1b]">Comprar</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {tier ? (
        <View className={`self-start rounded border px-1.5 py-0.5 ${tier.cls}`}>
          <Text className="font-mono text-[10px] font-semibold tracking-wider">{tier.label}</Text>
        </View>
      ) : null}

      <View className="flex-row flex-wrap items-center gap-1.5">
        {card.warranty ? (
          <View
            className="flex-row items-center gap-1 rounded border px-1.5 py-0.5"
            style={{
              borderColor: card.warranty.extended ? colors.accentCyan + '66' : colors.secondary + '66',
              backgroundColor: card.warranty.extended ? '#06222e' : '#06271a',
            }}
          >
            <AppIcon
              name="security"
              size={12}
              color={card.warranty.extended ? colors.accentCyan : colors.accentEmerald}
            />
            <Text
              className="font-mono text-[9px] font-semibold tracking-wider"
              style={{ color: card.warranty.extended ? '#67e8f9' : colors.accentEmerald }}
            >
              {card.warranty.extended ? 'COBERTURA EXTENDIDA' : `GARANTÍA ${card.warranty.days} DÍAS`}
            </Text>
          </View>
        ) : null}
        {card.priceFlag === 'suspicious' ? (
          <View className="flex-row items-center gap-1 rounded border border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5">
            <AppIcon name="notifications_active" size={12} color={colors.diagnosticAmber} />
            <Text className="font-mono text-[9px] font-semibold tracking-wider text-amber-400">
              PRECIO SOSPECHOSO
            </Text>
          </View>
        ) : null}
        {card.openComplaints && card.openComplaints > 0 ? (
          <View className="flex-row items-center gap-1 rounded border border-red-500/50 bg-red-500/10 px-1.5 py-0.5">
            <AppIcon name="report" size={12} color={colors.diagnosticRed} />
            <Text className="font-mono text-[9px] font-semibold tracking-wider text-red-400">
              QUEJA ABIERTA
            </Text>
          </View>
        ) : null}
        {card.identityVerified ? (
          <View className="flex-row items-center gap-1 rounded border border-sky-500/40 bg-sky-950/50 px-1.5 py-0.5">
            <AppIcon name="badge" size={12} color="#7dd3fc" />
            <Text className="font-mono text-[9px] font-semibold tracking-wider text-sky-300">ID VERIFICADO</Text>
          </View>
        ) : null}
        {card.escrowProtected === false ? (
          <View className="flex-row items-center gap-1 rounded border border-red-500/50 bg-red-500/10 px-1.5 py-0.5">
            <AppIcon name="lock_open" size={12} color={colors.diagnosticRed} />
            <Text className="font-mono text-[9px] font-semibold tracking-wider text-red-400">SIN CUSTODIA</Text>
          </View>
        ) : null}
      </View>

      <TelemetryPanel card={card} />
    </Pressable>
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
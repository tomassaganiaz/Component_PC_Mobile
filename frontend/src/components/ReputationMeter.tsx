import { Text, View } from 'react-native';

import { useI18n } from '../i18n';
import { colors } from '../theme';
import type { SellerReputation } from '../services/api';

const MEDAL_LABEL: Record<string, string> = {
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

export default function ReputationMeter({ reputation }: { reputation: SellerReputation }) {
  const { t } = useI18n();

  return (
    <View className="flex flex-col gap-2 rounded-xl border border-line bg-inset p-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-text-primary">{t('reputation.title')}</Text>
        <Text className="font-mono text-[11px] font-bold" style={{ color: reputation.color }}>
          {reputation.label.toUpperCase()}
        </Text>
      </View>

      <View className="flex-row gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            className="h-2 flex-1 rounded-full"
            style={{ backgroundColor: i <= reputation.level ? reputation.color : colors.elevated }}
          />
        ))}
      </View>

      <View className="flex-row flex-wrap items-center gap-1.5">
        <View className="rounded border border-line bg-panel px-2 py-0.5">
          <Text className="font-mono text-[10px] font-semibold text-text-secondary">
            {t('reputation.sales', { n: reputation.totalSales })}
          </Text>
        </View>
        <View className="rounded border border-line bg-panel px-2 py-0.5">
          <Text className="font-mono text-[10px] font-semibold text-text-secondary">
            {t('reputation.last60', { n: reputation.transactionsLast60d })}
          </Text>
        </View>
        <View className="rounded border border-line bg-panel px-2 py-0.5">
          <Text className="font-mono text-[10px] font-semibold text-text-secondary">
            {t('reputation.complaints', { pct: reputation.complaintRate })}
          </Text>
        </View>
        {reputation.medal !== 'none' ? (
          <View className="rounded border border-amber-500/50 bg-amber-500/10 px-2 py-0.5">
            <Text className="font-mono text-[10px] font-bold text-amber-400">
              {MEDAL_LABEL[reputation.medal] ?? reputation.medal}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

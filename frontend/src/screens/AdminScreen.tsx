import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import { useI18n } from '../i18n';
import { getAdminOverview } from '../services/api';
import type { AdminOverview } from '../services/api';
import { colors, shadow } from '../theme';
import type { Nav } from '../types';

function StatCard({
  icon,
  label,
  value,
  tone = colors.accentCyan,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <View className="flex-1 flex-col gap-1 rounded-xl border border-line bg-card p-3" style={shadow.card}>
      <View className="flex-row items-center gap-1.5">
        <AppIcon name={icon} size={15} color={tone} />
        <Text className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</Text>
      </View>
      <Text className="text-2xl font-bold text-text-primary">{value}</Text>
    </View>
  );
}

export default function AdminScreen({ nav }: { nav: Nav }) {
  const { t } = useI18n();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const overview = await getAdminOverview();
        if (!cancelled) setData(overview);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('admin.errLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setData(await getAdminOverview());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errLoad'));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('admin.subtitle')} activeTab />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
      >
        <View className="px-4 pb-2 pt-3">
          <Text className="text-2xl font-bold text-text-primary">{t('admin.title')}</Text>
          <Text className="mt-1 text-xs text-text-secondary">{t('admin.desc')}</Text>
        </View>

        {error ? (
          <View className="mx-4 mt-2 flex-row items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
            <AppIcon name="report" size={18} color={colors.diagnosticRed} />
            <Text className="flex-1 text-xs text-red-400">{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator color={colors.secondary} size="large" />
          </View>
        ) : data ? (
          <View className="flex flex-col gap-3 px-4 pt-3">
            <View className="flex-row gap-3">
              <StatCard icon="person" label={t('admin.users')} value={String(data.users)} />
              <StatCard icon="inventory_2" label={t('admin.products')} value={String(data.products)} />
            </View>
            <View className="flex-row gap-3">
              <StatCard icon="receipt_long" label={t('admin.orders')} value={String(data.orders)} />
              <StatCard
                icon="local_shipping"
                label={t('admin.delivered')}
                value={String(data.deliveredOrders)}
                tone={colors.accentEmerald}
              />
            </View>
            <View className="flex-row gap-3">
              <StatCard
                icon="attach_money"
                label={t('admin.revenue')}
                value={`$${Number(data.revenue).toFixed(2)}`}
                tone={colors.accentEmerald}
              />
            </View>
            <View className="flex-row gap-3">
              <StatCard
                icon="report"
                label={t('admin.complaints')}
                value={String(data.pendingComplaints)}
                tone={colors.diagnosticAmber}
              />
              <StatCard
                icon="flag"
                label={t('admin.reports')}
                value={String(data.openReports)}
                tone={colors.diagnosticRed}
              />
            </View>

            <View className="mt-1 flex-row items-start gap-2.5 rounded-xl border border-line bg-panel p-3">
              <AppIcon name="info" size={18} color={colors.textMuted} />
              <Text className="flex-1 text-xs leading-relaxed text-text-secondary">{t('admin.hint')}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <BottomNav active="profile" onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}

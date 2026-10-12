import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import { useI18n } from '../i18n';
import { getMySales } from '../services/api';
import type { SellerSale } from '../services/api';
import { colors, shadow } from '../theme';
import type { Nav } from '../types';

const STATUS_META: Record<string, { cls: string; tone: string }> = {
  pending: { cls: 'border-amber-500/40 bg-amber-500/10', tone: colors.diagnosticAmber },
  paid: { cls: 'border-cyan-500/40 bg-cyan-500/10', tone: colors.accentCyan },
  in_custody: { cls: 'border-cyan-500/40 bg-cyan-500/10', tone: colors.accentCyan },
  shipped: { cls: 'border-cyan-500/40 bg-cyan-500/10', tone: colors.accentCyan },
  delivered: { cls: 'border-emerald-500/40 bg-emerald-500/10', tone: colors.accentEmerald },
  cancelled: { cls: 'border-red-500/40 bg-red-500/10', tone: colors.diagnosticRed },
  refunded: { cls: 'border-red-500/40 bg-red-500/10', tone: colors.diagnosticRed },
};

const REFUNDED = new Set(['cancelled', 'refunded']);

export default function SalesScreen({ nav }: { nav: Nav }) {
  const { t } = useI18n();
  const [sales, setSales] = useState<SellerSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getMySales();
      setSales(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sales.errLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMySales();
        if (!cancelled) {
          setSales(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('sales.errLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const paidSales = sales.filter((s) => !REFUNDED.has(s.status));
  const revenue = paidSales.reduce((sum, s) => sum + Number(s.total), 0);
  const inCustody = paidSales.filter((s) => s.status !== 'delivered').length;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('sales.subtitle')} activeTab />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
      >
        <View className="px-4 pb-2 pt-3">
          <Text className="text-2xl font-bold text-text-primary">{t('sales.title')}</Text>
          <Text className="mt-1 text-xs leading-relaxed text-text-secondary">{t('sales.desc')}</Text>
        </View>

        {/* Summary */}
        <View className="flex-row gap-3 px-4 pt-2">
          <View className="flex-1 flex-col gap-1 rounded-xl border border-line bg-card p-3" style={shadow.card}>
            <Text className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
              {t('sales.summarySales')}
            </Text>
            <Text className="text-2xl font-bold text-text-primary">{paidSales.length}</Text>
          </View>
          <View className="flex-1 flex-col gap-1 rounded-xl border border-line bg-card p-3" style={shadow.card}>
            <Text className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
              {t('sales.summaryRevenue')}
            </Text>
            <Text className="text-2xl font-bold text-secondary">${revenue.toFixed(2)}</Text>
          </View>
          <View className="flex-1 flex-col gap-1 rounded-xl border border-line bg-card p-3" style={shadow.card}>
            <Text className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
              {t('sales.summaryCustody')}
            </Text>
            <Text className="text-2xl font-bold text-accent-cyan">{inCustody}</Text>
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View className="mx-4 mt-3 flex-row items-center gap-2.5 rounded-xl border border-red-500/40 bg-red-500/10 p-3">
            <AppIcon name="report" size={18} color={colors.diagnosticRed} />
            <Text className="flex-1 text-xs leading-relaxed text-red-400">{error}</Text>
            <Pressable onPress={onRefresh} className="rounded-lg border border-red-500/40 px-2.5 py-1">
              <Text className="text-xs font-semibold text-red-400">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* List */}
        <View className="px-4 pt-4">
          <Text className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            {t('sales.listTitle')} ({sales.length})
          </Text>

          {loading ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator color={colors.secondary} size="large" />
            </View>
          ) : sales.length === 0 ? (
            <View className="items-center justify-center gap-2.5 rounded-xl border border-line bg-panel px-6 py-10">
              <AppIcon name="sell" size={32} color={colors.textMuted} />
              <Text className="text-base font-semibold text-text-primary">{t('sales.empty')}</Text>
              <Text className="max-w-[280px] text-center text-xs leading-relaxed text-text-secondary">
                {t('sales.emptyDesc')}
              </Text>
            </View>
          ) : (
            <View className="flex flex-col gap-3">
              {sales.map((sale) => {
                const meta = STATUS_META[sale.status] ?? {
                  cls: 'border-line bg-inset',
                  tone: colors.textSecondary,
                };
                return (
                  <View key={sale.id} className="rounded-xl border border-line bg-panel p-3.5">
                    <View className="flex-row items-start gap-3">
                      <View className="h-9 w-9 items-center justify-center rounded-lg bg-elevated">
                        <AppIcon name="sell" size={18} color={colors.accentCyan} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="truncate text-sm font-semibold text-text-primary">
                          {sale.product?.title ?? `${t('sales.order')} #${sale.id.slice(0, 8).toUpperCase()}`}
                        </Text>
                        <Text className="font-mono text-[11px] text-text-secondary">
                          ${Number(sale.total).toFixed(2)} · #{sale.id.slice(0, 8).toUpperCase()}
                        </Text>
                      </View>
                      <View className={`rounded border px-2 py-0.5 ${meta.cls}`}>
                        <Text
                          className="font-mono text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: meta.tone }}
                        >
                          {t(`inspection.status.${sale.status}`)}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-2.5 flex flex-col gap-1.5 rounded-lg border border-line/60 bg-surface p-2.5">
                      <View className="flex-row items-center gap-2">
                        <AppIcon name="person" size={14} color={colors.textMuted} />
                        <Text className="flex-1 text-xs text-text-secondary">
                          {sale.buyer?.name ?? t('sales.unknownBuyer')}
                          {sale.buyer?.email ? (
                            <Text className="text-text-muted"> · {sale.buyer.email}</Text>
                          ) : null}
                        </Text>
                      </View>
                      {sale.shippingAddress ? (
                        <View className="flex-row items-start gap-2">
                          <AppIcon name="local_shipping" size={14} color={colors.textMuted} style={{ marginTop: 1 }} />
                          <Text className="flex-1 text-xs leading-relaxed text-text-secondary">
                            {sale.shippingAddress}
                          </Text>
                        </View>
                      ) : null}
                      <View className="flex-row items-center gap-2">
                        <AppIcon name="event" size={14} color={colors.textMuted} />
                        <Text className="text-xs text-text-muted">
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => nav.go({ name: 'inspection', orderId: sale.id })}
                      className="mt-2.5 flex-row items-center justify-center gap-1.5 rounded-lg border border-line bg-elevated py-2"
                    >
                      <AppIcon name="verified_user" size={15} color={colors.accentCyan} />
                      <Text className="text-xs font-semibold text-text-secondary">
                        {t('sales.track')}
                      </Text>
                      <AppIcon name="arrow_forward" size={14} color={colors.textMuted} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNav active="profile" onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}

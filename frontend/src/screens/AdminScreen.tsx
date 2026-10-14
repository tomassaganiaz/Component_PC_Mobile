import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import { useI18n } from '../i18n';
import { getAdminOverview, getComplaints, getReports, resolveReport, resolveReview } from '../services/api';
import type { AdminOverview, PendingReview, ReportItem } from '../services/api';
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
  const [complaints, setComplaints] = useState<PendingReview[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [overview, comp, reps] = await Promise.all([
        getAdminOverview(),
        getComplaints(),
        getReports('pending'),
      ]);
      setData(overview);
      setComplaints(comp.data);
      setReports(reps.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [overview, comp, reps] = await Promise.all([
          getAdminOverview(),
          getComplaints(),
          getReports('pending'),
        ]);
        if (!cancelled) {
          setData(overview);
          setComplaints(comp.data);
          setReports(reps.data);
        }
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

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const handleResolveComplaint = async (id: string) => {
    setActingId(id);
    setError(null);
    try {
      await resolveReview(id, 'resolved', 'Resuelta desde el panel admin');
      setComplaints((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errAction'));
    } finally {
      setActingId(null);
    }
  };

  const handleResolveReport = async (id: string, status: 'resolved' | 'rejected') => {
    setActingId(id);
    setError(null);
    try {
      await resolveReport(id, status);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errAction'));
    } finally {
      setActingId(null);
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
          <>
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
            </View>

            {/* Quejas pendientes */}
            <View className="px-4 pt-5">
              <Text className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                {t('admin.complaintsTitle')} ({complaints.length})
              </Text>
              {complaints.length === 0 ? (
                <View className="flex-row items-center gap-2.5 rounded-xl border border-line bg-panel p-3">
                  <AppIcon name="task_alt" size={18} color={colors.accentEmerald} />
                  <Text className="flex-1 text-xs text-text-secondary">{t('admin.noComplaints')}</Text>
                </View>
              ) : (
                <View className="flex flex-col gap-2">
                  {complaints.map((c) => (
                    <View key={c.id} className="rounded-xl border border-line bg-panel p-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-text-primary">
                          {c.product?.title ?? `#${c.id.slice(0, 6)}`}
                        </Text>
                        <View className="flex-row items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5">
                          <AppIcon name="star" size={11} color={colors.diagnosticAmber} />
                          <Text className="font-mono text-[10px] font-semibold text-amber-300">{c.rating}</Text>
                        </View>
                      </View>
                      <Text className="mt-1 text-xs leading-relaxed text-text-secondary">
                        {c.complaintReason ?? c.comment}
                      </Text>
                      <Text className="mt-1 font-mono text-[10px] text-text-muted">
                        {t('admin.by')} {c.buyer?.name ?? '—'}
                      </Text>
                      <Pressable
                        onPress={() => handleResolveComplaint(c.id)}
                        disabled={actingId === c.id}
                        className="mt-2 flex-row items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2"
                        style={actingId === c.id ? { opacity: 0.7 } : undefined}
                      >
                        {actingId === c.id ? (
                          <ActivityIndicator size="small" color={colors.accentEmerald} />
                        ) : (
                          <AppIcon name="check_circle" size={15} color={colors.accentEmerald} />
                        )}
                        <Text className="text-xs font-semibold text-emerald-300">{t('admin.resolve')}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Reportes */}
            <View className="px-4 pt-5">
              <Text className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                {t('admin.reportsTitle')} ({reports.length})
              </Text>
              {reports.length === 0 ? (
                <View className="flex-row items-center gap-2.5 rounded-xl border border-line bg-panel p-3">
                  <AppIcon name="task_alt" size={18} color={colors.accentEmerald} />
                  <Text className="flex-1 text-xs text-text-secondary">{t('admin.noReports')}</Text>
                </View>
              ) : (
                <View className="flex flex-col gap-2">
                  {reports.map((r) => (
                    <View key={r.id} className="rounded-xl border border-line bg-panel p-3">
                      <Text className="text-xs font-semibold text-text-primary">
                        {r.reporter?.name ?? '—'} → {r.reported?.name ?? '—'}
                      </Text>
                      <Text className="mt-1 text-xs leading-relaxed text-text-secondary">{r.reason}</Text>
                      {r.details ? (
                        <Text className="mt-0.5 text-[11px] text-text-muted">{r.details}</Text>
                      ) : null}
                      <View className="mt-2 flex-row gap-2">
                        <Pressable
                          onPress={() => handleResolveReport(r.id, 'resolved')}
                          disabled={actingId === r.id}
                          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2"
                        >
                          <AppIcon name="check_circle" size={15} color={colors.accentEmerald} />
                          <Text className="text-xs font-semibold text-emerald-300">{t('admin.resolve')}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleResolveReport(r.id, 'rejected')}
                          disabled={actingId === r.id}
                          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 py-2"
                        >
                          <AppIcon name="close" size={15} color={colors.diagnosticRed} />
                          <Text className="text-xs font-semibold text-red-400">{t('admin.dismiss')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="mx-4 mt-5 flex-row items-start gap-2.5 rounded-xl border border-line bg-panel p-3">
              <AppIcon name="info" size={18} color={colors.textMuted} />
              <Text className="flex-1 text-xs leading-relaxed text-text-secondary">{t('admin.hint')}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <BottomNav active="profile" onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}

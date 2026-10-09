import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import { useI18n } from '../i18n';
import { getAnalyticsEvents } from '../services/api';
import type { AnalyticsEventItem } from '../services/api';
import { colors } from '../theme';
import type { Nav } from '../types';

const EVENT_TONES: Record<string, { label: string; color: string; bg: string }> = {
  product_view: { label: 'Vistas de producto', color: colors.accentCyan, bg: '#06222e' },
  purchase: { label: 'Compras', color: colors.accentEmerald, bg: '#06271a' },
  filters_applied: { label: 'Filtros aplicados', color: colors.primary, bg: '#182845' },
  login: { label: 'Logins', color: colors.accentBlue, bg: '#0a1b2e' },
  logout: { label: 'Logouts', color: colors.textSecondary, bg: '#111a2e' },
};

export default function AnalyticsScreen({ nav }: { nav: Nav }) {
  const { t } = useI18n();
  const [events, setEvents] = useState<AnalyticsEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await getAnalyticsEvents(100));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los eventos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAnalyticsEvents(100);
        if (cancelled) return;
        setEvents(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar los eventos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) map.set(e.event, (map.get(e.event) ?? 0) + 1);
    return map;
  }, [events]);

  const renderItem = ({ item }: { item: AnalyticsEventItem }) => {
    const tone = EVENT_TONES[item.event] ?? { label: item.event, color: colors.textSecondary, bg: '#111a2e' };
    return (
      <View className="flex-row items-center gap-3 rounded-xl border border-[#233554] bg-[#111a2e] p-3">
        <View className="h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: tone.bg }}>
          <AppIcon
            name={item.event === 'purchase' ? 'lock' : item.event === 'product_view' ? 'visibility' : 'verified_user'}
            size={18}
            color={tone.color}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-text-primary">{tone.label}</Text>
          <Text className="truncate font-mono text-[11px] text-text-secondary">
            {item.page ?? '—'}
            {item.productId ? ` · ${item.productId.slice(0, 8)}` : ''}
          </Text>
        </View>
        <Text className="font-mono text-[10px] text-text-muted">
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="Dashboard Analytics" activeTab />

      <FlatList
        className="flex-1"
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View className="h-2" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-4">
            <Text className="text-2xl font-bold text-text-primary">{t('analytics.title')}</Text>
            <Text className="mt-1 text-xs text-text-secondary">
              {t('analytics.desc')}
            </Text>

            {loading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator color={colors.secondary} size="large" />
              </View>
            ) : error ? (
              <View className="mt-3 flex-row items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                <AppIcon name="report" size={18} color={colors.diagnosticRed} />
                <Text className="flex-1 text-xs leading-relaxed text-red-400">{error}</Text>
              </View>
            ) : (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {Object.entries(EVENT_TONES).map(([ev, meta]) => (
                  <View key={ev} className="flex-row items-center gap-1.5 rounded-lg border px-2.5 py-1.5" style={{ borderColor: meta.color + '55', backgroundColor: meta.bg }}>
                    <Text className="font-mono text-sm font-bold" style={{ color: meta.color }}>
                      {counts.get(ev) ?? 0}
                    </Text>
                    <Text className="font-mono text-[10px] text-text-secondary">{meta.label}</Text>
                  </View>
                ))}
                <View className="flex-1 rounded-lg border border-[#233554] bg-[#111a2e] px-2.5 py-1.5">
                  <Text className="font-mono text-sm font-bold text-text-primary">{events.length}</Text>
                  <Text className="font-mono text-[10px] text-text-secondary">{t('analytics.total')}</Text>
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View className="items-center justify-center gap-2 py-16">
              <AppIcon name="equalizer" size={30} color={colors.textMuted} />
              <Text className="text-sm font-semibold text-text-primary">{t('analytics.empty')}</Text>
              <Text className="text-center text-xs text-text-secondary">
                {t('analytics.emptyDesc')}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <Pressable
            onPress={load}
            disabled={loading}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-[#233554] bg-[#111a2e] py-3"
          >
            <AppIcon name="refresh" size={18} color={colors.textSecondary} />
            <Text className="text-sm font-semibold text-text-secondary">{t('analytics.refresh')}</Text>
          </Pressable>
        }
      />

      <BottomNav active="explore" onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}
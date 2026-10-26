import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import { useNotifications } from '../context/NotificationsContext';
import { useI18n } from '../i18n';
import { colors, shadow } from '../theme';
import type { Nav } from '../types';

const TYPE_ICON: Record<string, string> = {
  sale: 'sell',
  order_created: 'shopping_cart',
  order_paid: 'account_balance_wallet',
  order_shipped: 'local_shipping',
  order_delivered: 'check_circle',
  order_cancelled: 'close',
  order_stage: 'autorenew',
  review: 'star',
  system: 'notifications',
  new_product: 'storefront',
  price_drop: 'trending_down',
  back_in_stock: 'inventory_2',
  delivery_assigned: 'local_shipping',
  delivery_started: 'navigation',
  delivery_approaching: 'place',
  delivery_completed: 'check_circle',
  delivery_failed: 'block',
};

export default function NotificationsScreen({ nav }: { nav: Nav }) {
  const { t } = useI18n();
  const { items, unread, loading, refresh, markRead, markAllRead } = useNotifications();

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('notifications.subtitle')} activeTab />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
          <View>
            <Text className="text-2xl font-bold text-text-primary">{t('notifications.title')}</Text>
            <Text className="mt-1 text-xs text-text-secondary">
              {unread > 0 ? t('notifications.unread', { n: unread }) : t('notifications.allRead')}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={refresh}
              className="h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel"
            >
              <AppIcon name="refresh" size={17} color={colors.textSecondary} />
            </Pressable>
            {unread > 0 ? (
              <Pressable
                onPress={markAllRead}
                className="rounded-lg border border-line bg-panel px-3 py-2"
              >
                <Text className="text-xs font-semibold text-primary">{t('notifications.markAll')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="px-4 pt-2">
          {loading && items.length === 0 ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator color={colors.secondary} size="large" />
            </View>
          ) : items.length === 0 ? (
            <View className="items-center justify-center gap-2.5 rounded-xl border border-line bg-panel px-6 py-10">
              <AppIcon name="notifications" size={32} color={colors.textMuted} />
              <Text className="text-base font-semibold text-text-primary">{t('notifications.empty')}</Text>
              <Text className="max-w-[280px] text-center text-xs leading-relaxed text-text-secondary">
                {t('notifications.emptyDesc')}
              </Text>
            </View>
          ) : (
            <View className="flex flex-col gap-2">
              {items.map((n) => (
                <Pressable
                  key={n.id}
                  onPress={() => {
                    if (!n.read) void markRead(n.id);
                    // Si la notificación apunta a un producto/orden, navegar al detalle.
                    const meta = n.metadata ?? {};
                    if (typeof meta.productId === 'string') {
                      nav.go({ name: 'detail', productId: meta.productId });
                    } else if (typeof meta.orderId === 'string') {
                      nav.go({ name: 'inspection', orderId: meta.orderId });
                    }
                  }}
                  className={`flex-row items-start gap-3 rounded-xl border p-3 ${
                    n.read ? 'border-line bg-panel' : 'border-primary/30 bg-primary/5'
                  }`}
                  style={shadow.card}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-elevated">
                    <AppIcon name={TYPE_ICON[n.type] ?? 'notifications'} size={18} color={colors.accentCyan} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="flex-1 truncate text-sm font-semibold text-text-primary">{n.title}</Text>
                      {!n.read ? <View className="h-2 w-2 rounded-full bg-primary" /> : null}
                    </View>
                    <Text className="mt-0.5 text-xs leading-relaxed text-text-secondary">{n.body}</Text>
                    <Text className="mt-1 font-mono text-[10px] text-text-muted">
                      {new Date(n.createdAt).toLocaleString()}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNav active="profile" onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}

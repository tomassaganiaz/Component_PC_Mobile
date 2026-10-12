import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import ProductImage from '../components/ProductImage';
import { useCart } from '../context/CartContext';
import { useI18n } from '../i18n';
import { checkoutCart } from '../services/api';
import type { OrderItem } from '../services/api';
import { colors, glow, shadow } from '../theme';
import type { Nav } from '../types';

export default function CartScreen({ nav }: { nav: Nav }) {
  const { t } = useI18n();
  const { items, count, updateQty, remove, refresh } = useCart();

  const [address, setAddress] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneOrder, setDoneOrder] = useState<OrderItem | null>(null);

  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.product?.price ?? 0) * i.quantity,
    0,
  );

  const handleCheckout = async () => {
    if (!address.trim()) {
      setError(t('cart.errAddress'));
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const order = await checkoutCart({
        shippingAddress: address.trim(),
        paymentMethod: 'credit_card',
      });
      setDoneOrder(order);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cart.errCheckout'));
    } finally {
      setPlacing(false);
    }
  };

  if (doneOrder) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader subtitle={t('cart.subtitle')} activeTab />
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <View
            className="h-16 w-16 items-center justify-center rounded-2xl border border-secondary/40 bg-secondary/10"
            style={glow(colors.secondary, 16, 0.3)}
          >
            <AppIcon name="check_circle" size={34} color={colors.accentEmerald} />
          </View>
          <Text className="text-2xl font-bold text-text-primary">{t('cart.successTitle')}</Text>
          <Text className="text-center text-sm leading-relaxed text-text-secondary">
            {t('cart.successDesc', { total: Number(doneOrder.total).toFixed(2) })}
          </Text>
          <Pressable
            onPress={() => nav.go({ name: 'inspection', orderId: doneOrder.id })}
            className="mt-2 flex-row items-center gap-2 rounded-xl bg-secondary px-5 py-3"
            style={shadow.panel}
          >
            <AppIcon name="verified_user" size={18} color={colors.onSecondary} />
            <Text className="text-sm font-semibold text-on-secondary">{t('cart.track')}</Text>
          </Pressable>
          <Pressable onPress={() => nav.go({ name: 'explore' })} className="mt-1 px-4 py-2">
            <Text className="text-sm font-semibold text-primary">{t('cart.keepShopping')}</Text>
          </Pressable>
        </View>
        <BottomNav active="explore" onNavigate={(tab) => nav.go({ name: tab })} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('cart.subtitle')} activeTab />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pb-2 pt-3">
          <Text className="text-2xl font-bold text-text-primary">{t('cart.title')}</Text>
          <Text className="mt-1 text-xs text-text-secondary">
            {t('cart.items', { n: count })}
          </Text>
        </View>

        {items.length === 0 ? (
          <View className="px-4 pt-6">
            <View className="items-center justify-center gap-2.5 rounded-xl border border-line bg-panel px-6 py-10">
              <AppIcon name="shopping_cart" size={32} color={colors.textMuted} />
              <Text className="text-base font-semibold text-text-primary">{t('cart.empty')}</Text>
              <Text className="max-w-[280px] text-center text-xs leading-relaxed text-text-secondary">
                {t('cart.emptyDesc')}
              </Text>
              <Pressable
                onPress={() => nav.go({ name: 'explore' })}
                className="mt-2 rounded-xl bg-secondary px-5 py-3"
              >
                <Text className="text-sm font-semibold text-on-secondary">{t('cart.goShopping')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="flex flex-col gap-3 px-4 pt-2">
            {items.map((item) => (
              <View key={item.id} className="flex-row gap-3 rounded-xl border border-line bg-card p-3" style={shadow.card}>
                <View className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-inset">
                  <ProductImage
                    uri={item.product?.images?.[0]}
                    style={{ width: '100%', height: '100%' }}
                    iconSize={26}
                    width={160}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="truncate text-sm font-semibold text-text-primary">
                    {item.product?.title ?? item.productId.slice(0, 8)}
                  </Text>
                  <Text className="font-mono text-xs text-text-secondary">
                    ${Number(item.product?.price ?? 0).toFixed(2)}
                  </Text>
                  <View className="mt-2 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Pressable
                        onPress={() => {
                          if (item.quantity > 1) void updateQty(item.id, item.quantity - 1);
                        }}
                        className="h-7 w-7 items-center justify-center rounded-lg border border-line bg-elevated"
                      >
                        <AppIcon name="remove" size={15} color={colors.textSecondary} />
                      </Pressable>
                      <Text className="min-w-[20px] text-center font-mono text-sm font-semibold text-text-primary">
                        {item.quantity}
                      </Text>
                      <Pressable
                        onPress={() => void updateQty(item.id, item.quantity + 1)}
                        className="h-7 w-7 items-center justify-center rounded-lg border border-line bg-elevated"
                      >
                        <AppIcon name="add" size={15} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => void remove(item.id)}
                      className="h-8 w-8 items-center justify-center rounded-lg"
                    >
                      <AppIcon name="delete" size={17} color={colors.diagnosticRed} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            {/* Checkout */}
            <View className="mt-2 rounded-xl border border-line bg-panel p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-text-secondary">{t('cart.subtotal')}</Text>
                <Text className="text-xl font-bold text-text-primary">${subtotal.toFixed(2)}</Text>
              </View>

              <Text className="mb-1.5 mt-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                {t('product.checkout.address')}
              </Text>
              <TextInput
                value={address}
                onChangeText={(v) => {
                  setAddress(v);
                  setError(null);
                }}
                placeholder={t('product.checkout.addressPh')}
                placeholderTextColor={colors.textMuted}
                className="w-full rounded-xl border border-line bg-surface-low px-3 py-2.5 text-sm text-text-primary"
              />

              {error ? <Text className="mt-2 text-xs text-red-400">{error}</Text> : null}

              <Pressable
                onPress={handleCheckout}
                disabled={placing}
                className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-secondary py-3.5"
                style={placing ? { opacity: 0.7 } : shadow.panel}
              >
                {placing ? (
                  <AppIcon name="sync" size={18} color={colors.onSecondary} />
                ) : (
                  <AppIcon name="lock" size={18} color={colors.onSecondary} />
                )}
                <Text className="text-sm font-semibold text-on-secondary">
                  {placing ? t('product.checkout.placing') : t('cart.checkout')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {items.length > 0 ? (
        <View className="w-full flex-row items-center justify-between border-t border-line bg-surface/95 px-4 py-3">
          <View>
            <Text className="font-mono text-[11px] text-text-secondary">{t('cart.total')}</Text>
            <Text className="text-2xl font-bold text-text-primary">${subtotal.toFixed(2)}</Text>
          </View>
          <Text className="font-mono text-[11px] text-text-muted">
            {t('cart.items', { n: count })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import AppIcon from './AppIcon';
import { Avatar, PulseDot } from './ui';
import { useCart } from '../context/CartContext';
import { useNotifications } from '../context/NotificationsContext';
import { useThemeCtx } from '../context/ThemeContext';
import { IMAGES } from '../data/mock';
import { colors, shadow } from '../theme';

export default function AppHeader({
  subtitle,
  activeTab,
  onNotify,
}: {
  subtitle: string;
  activeTab?: boolean;
  onNotify?: () => void;
}) {
  const router = useRouter();
  const { unread } = useNotifications();
  const { count } = useCart();
  const { theme, toggle } = useThemeCtx();
  const handleNotify = onNotify ?? (() => router.push('/notifications'));
  return (
    <View
      className="w-full flex-row items-center justify-between bg-surface px-4 pb-2 pt-3"
      style={{
        borderBottomWidth: 1,
        borderBottomColor: '#20304a',
        ...shadow.top,
      }}
    >
      <View className="flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-low p-0.5">
          <Image source={{ uri: IMAGES.logo }} style={{ width: 28, height: 28 }} resizeMode="contain" />
        </View>
        <View className="flex-row items-baseline gap-1.5">
          <Text className="font-mono text-[14px] font-semibold uppercase tracking-tight text-primary">
            TechShield
          </Text>
          <Text className="hidden text-xs text-text-secondary" />
        </View>
        {activeTab ? (
          <>
            <View className="h-4 w-px bg-elevated" />
            <Text className="max-w-[120px] truncate text-xs text-text-secondary">{subtitle}</Text>
          </>
        ) : null}
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          className="h-10 w-10 items-center justify-center rounded-lg"
        >
          <AppIcon name={theme === 'dark' ? 'light_mode' : 'nightlight'} size={22} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/cart')}
          className="relative h-10 w-10 items-center justify-center rounded-lg"
        >
          <AppIcon name="shopping_cart" size={22} color={colors.textSecondary} />
          {count > 0 ? (
            <View className="absolute right-0.5 top-0.5 min-w-[16px] items-center justify-center rounded-full bg-secondary px-1">
              <Text className="text-[9px] font-bold text-on-secondary">{count > 9 ? '9+' : count}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          onPress={handleNotify}
          className="relative h-10 w-10 items-center justify-center rounded-lg"
          style={{ borderWidth: 1, borderColor: 'transparent' }}
        >
          <AppIcon name="notifications" size={22} color={colors.textSecondary} />
          {unread > 0 ? (
            <View className="absolute right-0.5 top-0.5 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1">
              <Text className="text-[9px] font-bold text-white">{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : (
            <View className="absolute right-2 top-2">
              <PulseDot size={6} />
            </View>
          )}
        </Pressable>
        <Avatar uri={IMAGES.profile} size={34} />
      </View>
    </View>
  );
}
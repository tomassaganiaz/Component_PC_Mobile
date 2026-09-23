import { Pressable, Text, View } from 'react-native';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import { colors } from '../theme';
import type { Nav, ScreenName } from '../types';

export default function PlaceholderScreen({
  nav,
  active,
  title,
  subtitle,
  icon,
}: {
  nav: Nav;
  active: ScreenName;
  title: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={title} activeTab />
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <View className="h-16 w-16 items-center justify-center rounded-2xl border border-[#233554] bg-[#111c33]">
          <AppIcon name={icon} size={32} color={colors.primary} />
        </View>
        <Text className="text-2xl font-bold text-text-primary">{title}</Text>
        <Text className="text-center text-sm text-text-secondary">{subtitle}</Text>
        <Pressable
          onPress={() => nav.go({ name: 'explore' })}
          className="mt-2 flex-row items-center gap-2 rounded-xl bg-primary px-5 py-3"
        >
          <Text className="text-sm font-semibold text-on-primary">Ir al Marketplace</Text>
          <AppIcon name="arrow_forward" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>
      <BottomNav active={active} onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}
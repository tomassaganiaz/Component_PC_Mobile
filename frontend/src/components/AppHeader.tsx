import { Image, Pressable, Text, View } from 'react-native';

import AppIcon from './AppIcon';
import { Avatar, PulseDot } from './ui';
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
        <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-[#23324d] bg-[#131c2e] p-0.5">
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
            <View className="h-4 w-px bg-[#23324d]" />
            <Text className="max-w-[120px] truncate text-xs text-text-secondary">{subtitle}</Text>
          </>
        ) : null}
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onNotify}
          className="relative h-10 w-10 items-center justify-center rounded-lg"
          style={{ borderWidth: 1, borderColor: 'transparent' }}
        >
          <AppIcon name="notifications" size={22} color={colors.textSecondary} />
          <View className="absolute right-2 top-2">
            <PulseDot size={6} />
          </View>
        </Pressable>
        <Avatar uri={IMAGES.profile} size={34} />
      </View>
    </View>
  );
}
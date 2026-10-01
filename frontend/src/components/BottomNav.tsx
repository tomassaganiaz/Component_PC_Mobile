import { Pressable, Text, View } from 'react-native';

import AppIcon from './AppIcon';
import { useI18n } from '../i18n';
import { colors, shadow } from '../theme';
import type { ScreenName } from '../types';

export default function BottomNav({
  active,
  onNavigate,
}: {
  active: ScreenName;
  onNavigate: (tab: ScreenName) => void;
}) {
  const { t } = useI18n();

  const TABS: { name: ScreenName; icon: string; labelKey: string }[] = [
    { name: 'explore', icon: 'grid_view', labelKey: 'nav.explore' },
    { name: 'filters', icon: 'manage_search', labelKey: 'nav.filters' },
    { name: 'publish', icon: 'add', labelKey: 'nav.publish' },
    { name: 'inspection', icon: 'verified_user', labelKey: 'nav.inspection' },
    { name: 'profile', icon: 'person', labelKey: 'nav.profile' },
  ];

  return (
    <View
      className="w-full flex-row items-center justify-around bg-[#090e1a]/95 px-1"
      style={{
        borderTopWidth: 1,
        borderTopColor: '#1d2b45',
        paddingBottom: 6,
        ...shadow.bottom,
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.name;
        if (tab.name === 'publish') {
          return (
            <Pressable
              key={tab.name}
              onPress={() => onNavigate(tab.name)}
              className="min-h-[48px] min-w-[48px] items-center justify-center"
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: '#1e3a73',
                  borderWidth: 1,
                  borderColor: colors.primary + '66',
                }}
              >
                <AppIcon name="add" size={22} color={colors.primary} />
              </View>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={tab.name}
            onPress={() => onNavigate(tab.name)}
            className="min-h-[48px] min-w-[48px] items-center justify-center px-2"
          >
            <View className="relative items-center">
              {tab.name === 'inspection' ? (
                <View className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-secondary" style={{ elevation: 4 }} />
              ) : null}
              <AppIcon
                name={tab.icon}
                size={24}
                color={isActive ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text
              className={`mt-0.5 text-[10px] leading-tight ${
                isActive ? 'font-semibold text-primary' : 'text-text-secondary'
              }`}
            >
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const tabs = [
  { label: 'Inicio', icon: 'home', path: '/' },
  { label: 'Publicar', icon: 'add-circle', path: '/publish' },
  { label: 'Perfil', icon: 'person', path: '/profile' },
];

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  return (
    <View className="bg-white border-t border-gray-200 flex-row pb-6 pt-2">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;

        return (
          <TouchableOpacity
            key={tab.path}
            className="flex-1 items-center py-2"
            onPress={() => {
              if (!isAuthenticated && tab.path !== '/') {
                router.push('/login');
              } else {
                router.push(tab.path);
              }
            }}
          >
            <Ionicons
              name={isActive ? (tab.icon as any) : (`${tab.icon}-outline` as any)}
              size={24}
              color={isActive ? '#3b82f6' : '#6b7280'}
            />
            <Text
              className={`text-xs mt-1 ${
                isActive ? 'text-blue-500 font-semibold' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

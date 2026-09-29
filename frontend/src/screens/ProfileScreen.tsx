import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import { Avatar } from '../components/ui';
import { getProfile } from '../services/api';
import { colors, glow, shadow } from '../theme';
import type { LoginSuccess, Nav, UserProfile } from '../types';

function Row({
  icon,
  label,
  value,
  tone = '#4edea3',
}: {
  icon: string;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-[#233554] bg-[#111a2e] px-3 py-3">
      <View className="flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-[#162238]">
          <AppIcon name={icon} size={17} color={tone} />
        </View>
        <Text className="text-sm text-text-primary">{label}</Text>
      </View>
      <Text className="font-mono text-xs font-semibold" style={{ color: tone }}>
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen({
  nav,
  session,
  onLogout,
}: {
  nav: Nav;
  session: LoginSuccess;
  onLogout: () => void;
}) {
  const [profile, setProfile] = useState<UserProfile>(session.user);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getProfile(session.access_token);
        if (!cancelled) setProfile(data);
      } catch {
        // keep session user
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.access_token]);

  const roleLabel =
    profile.role === 'seller' ? 'VENDEDOR' : profile.role === 'admin' ? 'ADMIN' : 'COMPRADOR';
  const idVerified = profile.documentVerified === true;
  const phoneVerified = profile.phoneVerified === true;
  const acceptsTesting = profile.acceptsTesting === true;

  const tierLabel = acceptsTesting
    ? idVerified
      ? 'SEGURO'
      : 'NORMAL'
    : idVerified
      ? 'NORMAL'
      : 'NO SEGURO';
  const tierTone =
    tierLabel === 'SEGURO'
      ? colors.accentEmerald
      : tierLabel === 'NORMAL'
        ? colors.accentCyan
        : colors.diagnosticRed;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="Mi Perfil" activeTab />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Identity card */}
        <View className="px-4 pt-3">
          <View className="flex-row items-center gap-3.5 rounded-xl border border-[#233554] bg-[#111c33] p-4" style={shadow.card}>
            <View className="relative">
              <Avatar uri={profile.avatar ?? undefined} size={60} initial={(profile.name[0] ?? 'T').toUpperCase()} ringColor={colors.primary + '66'} />
              <View
                className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full"
                style={{ backgroundColor: idVerified ? colors.secondary : colors.diagnosticAmber }}
              >
                <AppIcon name={idVerified ? 'verified' : 'badge'} size={12} color="#002e1b" />
              </View>
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="truncate text-xl font-bold text-text-primary">{profile.name}</Text>
                <View className="rounded border border-primary/30 bg-primary/20 px-1.5 py-0.5">
                  <Text className="font-mono text-[10px] font-bold text-primary">{roleLabel}</Text>
                </View>
              </View>
              <Text className="truncate font-mono text-xs text-text-secondary">{profile.email}</Text>
              <View className="mt-1.5 flex-row items-center gap-1.5">
                <View className="flex-row items-center gap-1 rounded border border-sky-500/40 bg-sky-950/50 px-1.5 py-0.5">
                  <AppIcon name="badge" size={12} color="#7dd3fc" />
                  <Text className="font-mono text-[10px] font-semibold text-sky-300">
                    {idVerified ? 'ID VERIFICADO' : 'ID PENDIENTE'}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1 rounded border border-[#233554] bg-[#111a2e] px-1.5 py-0.5">
                  <AppIcon name="phone_android" size={12} color={phoneVerified ? colors.accentEmerald : colors.textMuted} />
                  <Text className="font-mono text-[10px] font-semibold text-text-secondary">
                    {phoneVerified ? 'TEL VERIFICADO' : 'TEL SIN VERIFICAR'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Security tier */}
        <View className="px-4 pt-4">
          <View
            className="flex-row items-start gap-3 rounded-xl border p-4"
            style={{
              borderColor: tierTone + '55',
              backgroundColor: '#0d1728',
              ...glow(tierTone, 12, 0.12),
            }}
          >
            <View className="h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: tierTone + '22' }}>
              <AppIcon name="verified_user" size={22} color={tierTone} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-text-primary">Tu nivel de seguridad</Text>
              <View className="mt-1 self-start rounded border px-2 py-0.5" style={{ borderColor: tierTone + '66', backgroundColor: tierTone + '1a' }}>
                <Text className="font-mono text-[11px] font-bold tracking-wider" style={{ color: tierTone }}>
                  VENDEDOR {tierLabel}
                </Text>
              </View>
              <Text className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                {acceptsTesting
                  ? 'Aceptás revisiones y testeos antes de vender, lo que te habilita a alcanzar el nivel SEGURO.'
                  : 'Aceptás pocas o ninguna revisión. Activalas para subir tu nivel de seguridad.'}
              </Text>
            </View>
          </View>
        </View>

        {/* KYC checklist */}
        <View className="px-4 pt-4">
          <Text className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Verificación (KYC)
          </Text>
          <View className="flex flex-col gap-2">
            <Row
              icon="phone_android"
              label="Teléfono verificado"
              value={phoneVerified ? 'SÍ' : 'NO'}
              tone={phoneVerified ? colors.accentEmerald : colors.textMuted}
            />
            <Row
              icon="badge"
              label="Documento verificado"
              value={idVerified ? 'SÍ' : 'NO'}
              tone={idVerified ? colors.accentEmerald : colors.textMuted}
            />
            <Row
              icon="science"
              label="Acepta testeo previo"
              value={acceptsTesting ? 'SÍ' : 'NO'}
              tone={acceptsTesting ? colors.accentEmerald : colors.textMuted}
            />
          </View>
        </View>

        {/* Quick actions */}
        <View className="px-4 pt-4">
          <Text className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Cuenta
          </Text>
          <View className="flex flex-col gap-2">
            <Pressable
              onPress={() => nav.go({ name: 'publish' })}
              className="flex-row items-center gap-3 rounded-xl border border-[#233554] bg-[#111a2e] p-3"
            >
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-[#162238]">
                <AppIcon name="add" size={17} color={colors.primary} />
              </View>
              <Text className="flex-1 text-sm text-text-primary">Publicar un producto</Text>
              <AppIcon name="arrow_forward" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => nav.go({ name: 'inspection' })}
              className="flex-row items-center gap-3 rounded-xl border border-[#233554] bg-[#111a2e] p-3"
            >
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-[#162238]">
                <AppIcon name="verified_user" size={17} color={colors.accentCyan} />
              </View>
              <Text className="flex-1 text-sm text-text-primary">Seguimiento de auditoría</Text>
              <AppIcon name="arrow_forward" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => nav.go({ name: 'filters' })}
              className="flex-row items-center gap-3 rounded-xl border border-[#233554] bg-[#111a2e] p-3"
            >
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-[#162238]">
                <AppIcon name="manage_search" size={17} color={colors.accentEmerald} />
              </View>
              <Text className="flex-1 text-sm text-text-primary">Filtros de seguridad</Text>
              <AppIcon name="arrow_forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Logout */}
        <View className="px-4 pb-6 pt-5">
          <Pressable
            onPress={onLogout}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 py-3"
          >
            <AppIcon name="logout" size={18} color={colors.diagnosticRed} />
            <Text className="text-sm font-semibold text-red-400">Cerrar sesión</Text>
          </Pressable>
          <Text className="mt-3 text-center font-mono text-[10px] text-text-muted">
            TechShield · Marketplace Verificado · v1.0.0
          </Text>
        </View>
      </ScrollView>

      <BottomNav active="profile" onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';

import AppIcon from './../components/AppIcon';
import { login, register } from './../services/api';
import { colors, shadow } from '../theme';
import type { LoginSuccess } from '../types';

export default function RegisterScreen({ onLogin }: { onLogin: (session: LoginSuccess) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (name.trim().length < 2) {
      setError('Ingresá tu nombre (mínimo 2 caracteres).');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('Ingresá un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      const result = await login(email.trim(), password);
      if ((result as { requiresOtp?: boolean }).requiresOtp) {
        setError('Cuenta creada. Iniciá sesión para completar la verificación.');
        return;
      }
      onLogin(result as LoginSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldCls = 'w-full rounded-lg border border-[#233554] bg-[#111a2e] py-3 pl-4 pr-4 text-sm text-text-primary';

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4 py-3">
          <View className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-primary/10" />
          <View className="relative z-10 flex-row items-start gap-4 rounded-xl border border-border-subtle bg-surface-low p-4" style={shadow.panel}>
            <View className="h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest">
              <AppIcon name="shield_locked" size={28} color={colors.primary} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[28px] font-bold tracking-tight text-text-primary">Crear cuenta</Text>
              <Text className="mt-1 text-xs leading-relaxed text-text-secondary">
                Unite al marketplace verificado de hardware con custodia y auditoría técnica.
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-1 flex flex-col gap-4 px-4">
          <View className="flex flex-col gap-1.5">
            <Text className="font-mono text-[11px] uppercase text-text-secondary">Nombre / Alias</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Juan Pérez"
              placeholderTextColor={colors.textMuted}
              className={fieldCls}
            />
          </View>

          <View className="flex flex-col gap-1.5">
            <Text className="font-mono text-[11px] uppercase text-text-secondary">Correo electrónico</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              className={fieldCls}
            />
          </View>

          <View className="flex flex-col gap-1.5">
            <Text className="font-mono text-[11px] uppercase text-text-secondary">Contraseña</Text>
            <View className="relative flex-row items-center rounded-lg border border-[#233554] bg-[#111a2e]">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPass}
                className="w-full rounded-lg py-3 pl-4 pr-11 text-sm text-text-primary"
              />
              <Pressable
                onPress={() => setShowPass((v) => !v)}
                className="absolute right-2.5 h-8 w-8 items-center justify-center rounded"
              >
                <AppIcon name={showPass ? 'visibility' : 'visibility_off'} size={19} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <View className="flex flex-col gap-1.5">
            <Text className="font-mono text-[11px] uppercase text-text-secondary">Teléfono (opcional)</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+54 11 1234-5678"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              className={fieldCls}
            />
          </View>

          {error ? (
            <View className="flex-row items-start gap-2.5 rounded-lg border border-diagnostic-red/40 bg-diagnostic-red/10 p-3">
              <AppIcon name="notifications_active" size={20} color={colors.diagnosticRed} />
              <Text className="flex-1 text-xs leading-relaxed text-diagnostic-red">{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleRegister}
            disabled={submitting}
            className="mt-1 flex-row items-center justify-center gap-2 rounded-lg bg-primary py-3.5"
            style={[shadow.panel, submitting ? { opacity: 0.7 } : undefined]}
          >
            {submitting ? (
              <AppIcon name="sync" size={20} color={colors.onPrimary} />
            ) : (
              <AppIcon name="verified_user" size={20} color={colors.onPrimary} />
            )}
            <Text className="text-base font-semibold text-on-primary">
              {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </Text>
          </Pressable>

          <View className="items-center py-2">
            <Link href="/login" className="text-xs font-semibold text-primary">
              ¿Ya tenés cuenta? Iniciar sesión
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
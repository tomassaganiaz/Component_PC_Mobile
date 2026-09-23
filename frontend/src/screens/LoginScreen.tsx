import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import AppIcon from './../components/AppIcon';
import { DividerLabel, PulseDot } from './../components/ui';
import { isOtpChallenge, login, requestOtp, verifyOtp } from './../services/api';
import { colors, shadow } from '../theme';
import type { LoginSuccess } from '../types';

export default function LoginScreen({ onLogin }: { onLogin: (session: LoginSuccess) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const handleBiometric = () => {
    setBiometricLoading(true);
    setTimeout(() => setBiometricLoading(false), 1200);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Ingresá tu correo TechShield y tu clave para continuar.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (isOtpChallenge(result)) {
        setOtpToken(result.otpToken);
        setOtpError(null);
        const otp = await requestOtp(result.otpToken);
        setOtpHint(otp.code);
      } else {
        onLogin(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpToken || !/^\d{6}$/.test(otpCode)) {
      setOtpError('Ingresá el código de 6 dígitos.');
      return;
    }
    setOtpVerifying(true);
    setOtpError(null);
    try {
      const session = await verifyOtp(otpToken, otpCode);
      onLogin(session);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'No se pudo verificar el código.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleCancelOtp = () => {
    setOtpToken(null);
    setOtpCode('');
    setOtpHint(null);
    setOtpError(null);
  };

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status chip strip */}
        <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
          <View className="flex-row items-center gap-1 rounded bg-surface-container-high px-2.5 py-1">
            <PulseDot color={colors.accentCyan} size={6} />
            <Text className="font-mono text-[11px] uppercase tracking-wider text-accent-cyan">
              TLS 1.3 // ENCLAVE ACTIVO
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <AppIcon name="verified" size={15} color={colors.accentEmerald} />
            <Text className="font-mono text-[11px] text-text-secondary">Nodo Madrid #04</Text>
          </View>
        </View>

        {/* Hero banner */}
        <View className="px-4 py-2">
          <View
            className="overflow-hidden rounded-xl border border-border-subtle bg-surface-low p-4"
            style={shadow.panel}
          >
            <View className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-primary/10" />
            <View className="pointer-events-none absolute -left-6 -top-6 h-32 w-32 rounded-full bg-secondary/10" />
            <View className="relative z-10 flex-row items-start gap-4">
              <View className="h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest">
                <AppIcon name="shield_locked" size={28} color={colors.primary} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[28px] font-bold tracking-tight text-text-primary">Acceso Seguro</Text>
                <Text className="mt-1 text-xs leading-relaxed text-text-secondary">
                  Mercado auditado de componentes y móviles certificados con telemetría de silicio y garantía técnica.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main interaction area */}
        <View className="mt-1 flex flex-col gap-4 px-4">
          {/* Biometric card */}
          <Pressable
            onPress={handleBiometric}
            className="relative w-full rounded-xl bg-surface-container p-4"
            style={shadow.card}
          >
            <View className="flex-row items-center justify-between">
              <View className="min-w-0 flex-row items-center gap-4">
                <View className="relative h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-surface-container-highest">
                  <AppIcon name="fingerprint" size={26} color={colors.secondary} />
                </View>
                <View className="min-w-0">
                  {biometricLoading ? (
                    <View className="flex-row items-center gap-2 py-1">
                      <AppIcon name="sync" size={22} color={colors.accentCyan} />
                      <Text className="font-mono text-xs text-text-primary">Validando sensor biométrico...</Text>
                    </View>
                  ) : (
                    <>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-lg font-semibold text-text-primary">Face ID / Biometría</Text>
                        <View className="rounded bg-secondary/20 px-1.5 py-0.5">
                          <Text className="font-mono text-[11px] text-accent-emerald">RÁPIDO</Text>
                        </View>
                      </View>
                      <Text className="truncate text-xs text-text-muted">
                        Autenticación local mediante enclave FIDO
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-bright">
                <AppIcon name="lock_open" size={18} color={colors.textPrimary} />
              </View>
            </View>
          </Pressable>

          <DividerLabel>o usa credenciales</DividerLabel>

          {/* Email field */}
          <View className="flex flex-col gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text className="font-mono text-[11px] uppercase text-text-secondary">
                Identificador / Correo TechShield
              </Text>
              <Text className="font-mono text-[11px] text-text-muted">AUTH_UID</Text>
            </View>
            <View className="relative flex-row items-center rounded-lg bg-surface-low">
              <View className="pointer-events-none absolute left-3">
                <AppIcon name="badge" size={20} color={colors.textMuted} />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="operador@red-techshield.net"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                className="w-full rounded-lg py-3 pl-11 pr-4 text-sm text-text-primary"
              />
            </View>
          </View>

          {/* Password field */}
          <View className="flex flex-col gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text className="font-mono text-[11px] uppercase text-text-secondary">
                Clave Criptográfica Maestra
              </Text>
              <Text className="font-mono text-[11px] text-text-muted">SHA-256</Text>
            </View>
            <View className="relative flex-row items-center rounded-lg bg-surface-low">
              <View className="pointer-events-none absolute left-3">
                <AppIcon name="terminal" size={20} color={colors.textMuted} />
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPass}
                className="w-full rounded-lg py-3 pl-11 pr-11 font-mono text-sm text-text-primary"
              />
              <Pressable
                onPress={() => setShowPass((v) => !v)}
                className="absolute right-2.5 h-8 w-8 items-center justify-center rounded"
              >
                <AppIcon
                  name={showPass ? 'visibility' : 'visibility_off'}
                  size={19}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Remember + recovery */}
          <View className="flex-row items-center justify-between pt-0.5">
            <Pressable className="flex-row items-center gap-2" onPress={() => setRemember((v) => !v)}>
              <View
                className="h-5 w-5 items-center justify-center rounded bg-surface-container-highest"
                style={{ borderWidth: 0 }}
              >
                {remember ? (
                  <AppIcon name="check" size={15} color={colors.onSecondary} />
                ) : null}
              </View>
              <Text className="text-xs text-text-secondary">Enlazar terminal (30d)</Text>
            </Pressable>
            <Text className="text-xs text-accent-blue">¿Olvidaste tu clave?</Text>
          </View>

          {/* OTP two-step */}
          {otpToken ? (
            <View className="flex flex-col gap-3 rounded-xl border border-accent-cyan/40 bg-[#06222e] p-4">
              <View className="flex-row items-center gap-2">
                <AppIcon name="verified_user" size={20} color={colors.accentCyan} />
                <Text className="text-base font-semibold text-text-primary">Verificación en dos pasos</Text>
              </View>
              <Text className="text-xs leading-relaxed text-text-secondary">
                Ingresá el código de 6 dígitos enviado a tu dispositivo para completar el acceso.
              </Text>
              {otpHint ? (
                <View className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-2">
                  <Text className="font-mono text-xs text-cyan-300">
                    Demo (no hay SMS): código = {otpHint}
                  </Text>
                </View>
              ) : null}
              <TextInput
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                className="rounded-lg border border-[#233554] bg-surface-low px-4 py-3 font-mono text-center text-lg tracking-[6px] text-text-primary"
              />
              {otpError ? <Text className="text-xs text-diagnostic-red">{otpError}</Text> : null}
              <Pressable
                onPress={handleVerifyOtp}
                disabled={otpVerifying}
                className="flex-row items-center justify-center gap-2 rounded-lg bg-accent-cyan py-3.5"
                style={otpVerifying ? { opacity: 0.7 } : undefined}
              >
                {otpVerifying ? (
                  <AppIcon name="sync" size={18} color="#06222e" />
                ) : (
                  <AppIcon name="verified" size={18} color="#06222e" />
                )}
                <Text className="text-sm font-semibold text-[#06222e]">Verificar Código</Text>
              </Pressable>
              <Pressable onPress={handleCancelOtp} className="items-center py-1">
                <Text className="text-xs text-text-secondary">Volver al inicio de sesión</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Error banner */}
          {error ? (
            <View className="flex-row items-start gap-2.5 rounded-lg border border-diagnostic-red/40 bg-diagnostic-red/10 p-3">
              <AppIcon name="notifications_active" size={20} color={colors.diagnosticRed} />
              <Text className="flex-1 text-xs leading-relaxed text-diagnostic-red">{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || !!otpToken}
            className="mt-1 flex-row items-center justify-center gap-2 rounded-lg bg-primary py-3.5"
            style={[shadow.panel, submitting || otpToken ? { opacity: 0.7 } : undefined]}
          >
            {submitting ? (
              <>
                <AppIcon name="sync" size={20} color={colors.onPrimary} />
                <Text className="text-base font-semibold text-on-primary">Descifrando Enclave...</Text>
              </>
            ) : (
              <>
                <AppIcon name="verified_user" size={20} color={colors.onPrimary} />
                <Text className="text-base font-semibold text-on-primary">Iniciar Sesión Auditada</Text>
              </>
            )}
          </Pressable>

          {/* Alt auth */}
          <View className="mt-1 flex flex-col gap-2">
            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-surface-container py-2.5"
                style={{ borderWidth: 1, borderColor: '#1e293b' }}
              >
                <AppIcon name="token" size={18} color={colors.accentCyan} />
                <Text className="font-mono text-[11px] tracking-tight text-text-primary">Llave FIDO2 / NFC</Text>
              </Pressable>
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-surface-container py-2.5"
                style={{ borderWidth: 1, borderColor: '#1e293b' }}
              >
                <Text style={{ color: '#4285F4', fontWeight: '700', fontSize: 16 }}>G</Text>
                <Text className="font-mono text-[11px] tracking-tight text-text-primary">Cuenta Google</Text>
              </Pressable>
            </View>
          </View>

          {/* Escrow trust card */}
          <View className="mt-1 flex-row items-start gap-3 rounded-xl bg-surface-low p-4" style={shadow.panel}>
            <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-container/20">
              <AppIcon name="account_balance" size={19} color={colors.accentEmerald} />
            </View>
            <View className="min-w-0">
              <Text className="text-base font-medium text-text-primary">Custodia Escrow 100% Protegida</Text>
              <Text className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                Tus fondos permanecen asegurados en smart-contract hasta que el peritaje de silicio y ciclo de batería
                coincidan con la orden.
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="flex flex-col items-center gap-1 py-4 text-center">
          <Text className="text-xs text-text-secondary">
            ¿Aún no tienes registro técnico?{' '}
            <Text className="font-semibold text-accent-emerald">Crear cuenta verificada</Text>
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            <PulseDot size={6} />
            <Text className="font-mono text-[11px] text-text-muted">
              CLIENT BUILD 4.9.11 // SEC-SIG: <Text className="text-text-secondary">7F8A..93E2</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
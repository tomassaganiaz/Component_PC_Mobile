import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import { Pill, PulseDot } from '../components/ui';
import { chatSafetyCheck } from '../services/api';
import { IMAGES, INSPECTION_STEPS } from '../data/mock';
import { colors, glow, shadow } from '../theme';
import type { ChatSafetyResult } from '../services/api';
import type { Nav } from '../types';

const BUNDLE_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDzj_nGfzBo7QtQwKBhnSx1ENuov_qVPfyvx_YZqg1Lcloc8ake35CYfySDw9vH0_qo4vHWptdzGFVp9TEgslYgekvtQItt0DdcU9H0LgE5Sc0NXsZ6zmFA20HekCsN1mHuXDIVRAh4CMKMT9UdC64Pi_9W4HpPldUuf3n-uK0kFXB3zBVG2lh47m2kv7v1zn3DMc5tI9T1r6D-SYhBHroFfRgHCxQDkZOq7rXQJvS1IG4fep0zHcA';

function StepNode({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') {
    return (
      <View className="h-7 w-7 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/20">
        <AppIcon name="check" size={17} color={colors.accentEmerald} />
      </View>
    );
  }
  if (state === 'active') {
    return (
      <View className="relative h-7 w-7 items-center justify-center rounded-full border border-cyan-400 bg-blue-600">
        <PulseDot color={colors.accentCyan} size={10} />
        <AppIcon name="biotech" size={16} color="#ffffff" />
      </View>
    );
  }
  return (
    <View className="h-7 w-7 items-center justify-center rounded-full border border-[#22324f] bg-[#162238]">
      <AppIcon name="inventory_2" size={16} color="#64748b" />
    </View>
  );
}

export default function InspectionScreen({ nav }: { nav: Nav }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatChecking, setChatChecking] = useState(false);
  const [chatResult, setChatResult] = useState<ChatSafetyResult | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const handleChatCheck = async () => {
    if (!chatText.trim()) return;
    setChatChecking(true);
    setChatError(null);
    try {
      setChatResult(await chatSafetyCheck(chatText));
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'No se pudo analizar el mensaje.');
    } finally {
      setChatChecking(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="Verified Orders" activeTab />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status aura banner */}
        <View className="px-4 pb-4 pt-3">
          <View
            className="overflow-hidden rounded-xl border border-[#22324f] bg-[#111a2e] p-4"
            style={shadow.card}
          >
            <View className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10" />
            <View className="mb-2 flex-row items-center justify-between">
              <Pill icon="verified" tone="emerald">Custodia Activa</Pill>
              <Text className="font-mono text-[11px] font-medium text-text-secondary">ID: TS-40922-LAB</Text>
            </View>
            <View className="mt-3 flex-row items-start gap-3">
              <View className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-700/60 bg-[#0a0f1d] p-1">
                <Image source={{ uri: BUNDLE_IMAGE }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-1">
                  <AppIcon name="verified" size={16} color={colors.accentCyan} />
                  <Text className="font-mono text-[11px] font-semibold tracking-wide text-accent-cyan">
                    Escrow TechShield 100%
                  </Text>
                </View>
                <Text className="mt-0.5 truncate text-xl leading-snug text-slate-100">
                  AMD Ryzen 7 5800X3D + B550
                </Text>
                <Text className="truncate text-xs text-slate-400">Bundle Enthusiast • Vendedor: @CyberDave_PC</Text>
              </View>
            </View>
            <View
              className="mt-4 flex-row items-center justify-between rounded-lg border border-[#22324f]/70 bg-[#0a0f1d]/80 p-3"
            >
              <View>
                <Text className="block text-[11px] text-slate-400">Total retenido en bóveda</Text>
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-2xl font-bold tracking-tight text-white">$310.00</Text>
                  <Text className="font-mono text-[11px] text-slate-400">USD</Text>
                </View>
              </View>
              <View
                className="flex-row items-center gap-1 rounded border border-emerald-500/40 bg-emerald-950/70 px-2.5 py-1"
                style={glow('#10b981', 12, 0.15)}
              >
                <AppIcon name="lock" size={14} color={colors.accentEmerald} />
                <Text className="font-mono text-[11px] font-semibold text-emerald-300">Fondos Blindados</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Lead inspector */}
        <View className="mb-4 px-4">
          <View className="flex-row items-center gap-3 rounded-xl border border-[#22324f] bg-[#111a2e] p-3" style={shadow.panel}>
            <View className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-cyan-500/40 bg-[#0a0f1d] p-0.5">
              <Image source={{ uri: IMAGES.inspector }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-1">
                <Text className="text-xs font-semibold text-slate-200">Ing. Marcos Varela</Text>
                <AppIcon name="verified" size={16} color={colors.accentEmerald} />
              </View>
              <Text className="truncate font-mono text-[11px] text-slate-400">Perito Certificado IPC-A-610 • Mesa #04</Text>
            </View>
            <Pressable
              onPress={() => setChatOpen(true)}
              className="flex-row items-center gap-1 rounded-lg border border-cyan-500/30 bg-[#162238] px-3 py-1.5"
            >
              <AppIcon name="chat" size={17} color={colors.accentCyan} />
              <Text className="text-xs font-semibold text-cyan-300">Chat</Text>
            </Pressable>
          </View>
        </View>

        {/* Workflow tracker */}
        <View className="mb-4 px-4">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <AppIcon name="science" size={20} color={colors.accentCyan} />
              <Text className="text-xl font-semibold text-slate-100">Trazabilidad de Seguridad</Text>
            </View>
            <View className="rounded border border-[#22324f] bg-[#162238] px-2 py-0.5">
              <Text className="font-mono text-[11px] text-cyan-300">Fase 3 de 5</Text>
            </View>
          </View>

          <View className="flex flex-col gap-4 rounded-xl border border-[#22324f] bg-[#111a2e] p-4" style={shadow.panel}>
            {INSPECTION_STEPS.map((step, i) => (
              <View key={step.title} className="flex-row gap-3">
                <View className="flex flex-col items-center">
                  <StepNode state={step.state} />
                  {i < INSPECTION_STEPS.length - 1 ? (
                    <View
                      className="w-0.5 flex-1"
                      style={{ backgroundColor: step.state === 'done' ? '#34d399' : '#22324f' }}
                    />
                  ) : null}
                </View>

                <View className="flex-1" style={i < INSPECTION_STEPS.length - 1 ? { paddingBottom: 8 } : undefined}>
                  <View className="flex-row items-center justify-between">
                    {step.state === 'active' ? (
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-bold text-cyan-300">{step.title}</Text>
                        <View className="rounded-full border border-blue-500/40 bg-blue-950/80 px-2 py-0.5">
                          <Text className="font-mono text-[10px] font-semibold text-cyan-300">{step.meta}</Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Text
                          className={`text-sm ${
                            step.state === 'done'
                              ? 'font-semibold text-slate-200'
                              : 'font-medium text-slate-400'
                          }`}
                        >
                          {step.title}
                        </Text>
                        <Text className="font-mono text-[11px] text-slate-500">{step.meta}</Text>
                      </>
                    )}
                  </View>

                  {step.state === 'active' && step.percent ? (
                    <Text className="font-mono text-[11px] font-bold text-cyan-400">{step.percent}</Text>
                  ) : null}

                  <Text
                    className={`mt-0.5 text-xs ${
                      step.state === 'pending' ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {step.desc}
                  </Text>

                  {step.state === 'active' && step.checkpoints ? (
                    <View className="mt-3 flex flex-col gap-2 rounded-lg border border-[#22324f] bg-[#0a0f1d] p-2.5">
                      {step.checkpoints.map((cp) => (
                        <View
                          key={cp.title}
                          className="flex-row items-center justify-between rounded border border-[#22324f]/60 bg-[#111a2e]/90 px-2.5 py-1.5"
                          style={cp.status === 'running' ? { borderColor: '#3b82f6' } : undefined}
                        >
                          <View className="flex-row items-center gap-2">
                            <AppIcon
                              name={cp.icon}
                              size={18}
                              color={cp.status === 'approved' ? colors.accentEmerald : colors.accentCyan}
                            />
                            <View>
                              <Text className="text-xs font-medium leading-tight text-slate-200">{cp.title}</Text>
                              <Text className="font-mono text-[11px] text-slate-400">{cp.meta}</Text>
                            </View>
                          </View>
                          {cp.status === 'approved' ? (
                            <View
                              className="rounded border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5"
                              style={glow('#10b981', 8, 0.15)}
                            >
                              <Text className="font-mono text-[11px] font-bold text-emerald-300">APROBADO</Text>
                            </View>
                          ) : (
                            <View className="rounded border border-blue-400/40 bg-blue-900/60 px-2 py-0.5">
                              <Text className="font-mono text-[11px] font-bold text-cyan-300">FINALIZANDO</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Telemetry snapshot */}
        <View className="mb-4 px-4">
          <View className="rounded-xl border border-[#22324f] bg-[#111a2e] p-4" style={shadow.panel}>
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <AppIcon name="equalizer" size={20} color={colors.accentEmerald} />
                <Text className="text-xl font-semibold text-slate-100">Telemetría de la Muestra</Text>
              </View>
              <View className="rounded border border-[#22324f] bg-[#0a0f1d] px-2 py-0.5">
                <Text className="font-mono text-[11px] text-slate-400">Hash: #9a4f-88e2</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1 rounded-lg border border-[#22324f] bg-[#0a0f1d] p-2.5">
                <Text className="block font-mono text-[10px] uppercase text-slate-400">Temp Max</Text>
                <Text className="text-xl font-bold text-emerald-400">67.4°C</Text>
                <Text className="mt-0.5 block text-[11px] text-emerald-300/80">Óptimo (&lt;85°C)</Text>
              </View>
              <View className="flex-1 rounded-lg border border-[#22324f] bg-[#0a0f1d] p-2.5">
                <Text className="block font-mono text-[10px] uppercase text-slate-400">Multi-Core</Text>
                <Text className="text-xl font-bold text-slate-100">14,890</Text>
                <Text className="mt-0.5 block text-[11px] text-slate-400">Pts R23 Cinebench</Text>
              </View>
              <View className="flex-1 rounded-lg border border-[#22324f] bg-[#0a0f1d] p-2.5">
                <Text className="block font-mono text-[10px] uppercase text-slate-400">Salud Pines</Text>
                <Text className="text-xl font-bold text-emerald-400">100%</Text>
                <Text className="mt-0.5 block text-[11px] text-emerald-300/80">1331/1331 AM4</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Download certificate */}
        <View className="mb-4 px-4">
          <Pressable
            className="flex-row items-center justify-between rounded-xl border border-[#22324f] bg-[#111a2e] p-4"
            style={shadow.panel}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-lg border border-blue-500/40 bg-blue-950/80">
                <AppIcon name="verified" size={24} color={colors.accentCyan} />
              </View>
              <View>
                <Text className="text-sm font-semibold text-slate-100">Certificado Técnico Preliminar</Text>
                <Text className="font-mono text-xs text-slate-400">
                  PDF Firmado criptográficamente por TechShield Labs
                </Text>
              </View>
            </View>
            <AppIcon name="download" size={22} color={colors.accentCyan} />
          </Pressable>
        </View>

        {/* Buyer protection */}
        <View className="mb-4 px-4">
          <LinearGradient
            colors={['#063321', '#0a1622']}
            className="relative overflow-hidden rounded-xl border border-emerald-500/30 p-4"
            style={shadow.panel}
          >
            <View className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-emerald-500/10" />
            <View className="flex-row items-start gap-3">
              <View
                className="mt-0.5 h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/20"
                style={glow('#10b981', 10, 0.2)}
              >
                <AppIcon name="shield_with_heart" size={22} color={colors.accentEmerald} />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-emerald-200">Garantía TechShield Zero-Riesgo</Text>
                <Text className="mt-1 text-xs leading-relaxed text-slate-300">
                  Si la placa o el procesador reprueban las pruebas finales de VRM o manifiestan inestabilidad oculta,
                  la transacción se cancela instantáneamente. Tus <Text className="font-bold text-white">$310 USD</Text>{' '}
                  serán reintegrados al 100% en tu saldo bancario en menos de 2 horas sin comisiones.
                </Text>
                <View className="mt-3 flex-row flex-wrap items-center gap-3 pt-1">
                  <View className="flex-row items-center gap-1">
                    <AppIcon name="security" size={16} color={colors.accentEmerald} />
                    <Text className="font-mono text-[11px] font-bold text-emerald-300">Reembolso 100% Express</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <AppIcon name="handshake" size={16} color={colors.accentEmerald} />
                    <Text className="font-mono text-[11px] font-bold text-emerald-300">Retorno sin costo al vendedor</Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Secondary actions */}
        <View className="flex flex-col gap-2.5 px-4 pb-6">
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3"
            style={glow('#2563eb', 20, 0.35)}
          >
            <AppIcon name="account_balance_wallet" size={20} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">Verificar Detalle de Custodia Financiera</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-xl border border-[#22324f] bg-[#111a2e] py-3"
          >
            <AppIcon name="contact_support" size={20} color={colors.accentCyan} />
            <Text className="text-sm font-semibold text-slate-200">
              Solicitar Videollamada de Comprobación en Vivo
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Chat safety modal */}
      <Modal visible={chatOpen} transparent animationType="slide" onRequestClose={() => setChatOpen(false)}>
        <View className="flex-1 items-center justify-end bg-black/70">
          <View className="w-full rounded-t-3xl border-t border-[#233554] bg-[#0e1626] p-5" style={shadow.bottom}>
            <View className="flex-row items-center gap-2">
              <AppIcon name="chat" size={20} color={colors.accentCyan} />
              <Text className="text-lg font-semibold text-text-primary">Chat seguro</Text>
            </View>

            <View className="mt-3 flex flex-col gap-1.5 rounded-xl border border-[#22324f] bg-[#111a2e] p-3">
              <Text className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                Consejos de seguridad
              </Text>
              <Text className="text-xs leading-relaxed text-text-secondary">
                • Nunca compartas email, teléfono ni WhatsApp fuera de la plataforma.
              </Text>
              <Text className="text-xs leading-relaxed text-text-secondary">
                • No aceptes pagos por transferencia directa: usa siempre la custodia (escrow).
              </Text>
              <Text className="text-xs leading-relaxed text-text-secondary">
                • No abras enlaces acortados ni sitios externos: las compras se hacen dentro de TechShield.
              </Text>
            </View>

            <TextInput
              value={chatText}
              onChangeText={setChatText}
              placeholder="Escribí el mensaje para analizarlo..."
              placeholderTextColor={colors.textMuted}
              multiline
              className="mt-3 min-h-[70px] rounded-xl border border-[#22324f] bg-[#111a2e] p-3 text-sm text-text-primary"
            />

            {chatError ? <Text className="mt-2 text-xs text-diagnostic-red">{chatError}</Text> : null}

            {chatResult ? (
              <View
                className="mt-3 rounded-xl border p-3"
                style={{
                  borderColor: chatResult.safe ? colors.secondary + '66' : colors.diagnosticAmber + '66',
                  backgroundColor: chatResult.safe ? '#06271a' : '#2a1f08',
                }}
              >
                <Text
                  className="font-mono text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: chatResult.safe ? colors.accentEmerald : colors.diagnosticAmber }}
                >
                  {chatResult.safe ? 'Mensaje seguro' : `${chatResult.warnings.length} advertencia(s)`}
                </Text>
                {chatResult.warnings.map((w) => (
                  <Text key={w} className="mt-1 text-xs leading-relaxed text-text-secondary">
                    • {w}
                  </Text>
                ))}
                {!chatResult.safe ? (
                  <Text className="mt-2 font-mono text-[11px] text-text-muted">
                    Texto saneado: {chatResult.sanitizedText}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => setChatOpen(false)}
                className="flex-1 items-center justify-center rounded-xl border border-[#22324f] bg-[#111a2e] py-3"
              >
                <Text className="text-sm font-semibold text-text-secondary">Cerrar</Text>
              </Pressable>
              <Pressable
                onPress={handleChatCheck}
                disabled={chatChecking}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-accent-cyan py-3"
                style={chatChecking ? { opacity: 0.7 } : undefined}
              >
                {chatChecking ? <AppIcon name="sync" size={16} color="#06222e" /> : <AppIcon name="verified" size={16} color="#06222e" />}
                <Text className="text-sm font-semibold text-[#06222e]">Analizar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNav active="inspection" onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}
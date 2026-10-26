import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import ProductImage from '../components/ProductImage';
import { Pill, ProgressBar, PulseDot } from '../components/ui';
import { useI18n } from '../i18n';
import {
  advanceOrderFulfillment,
  cancelOrder,
  chatSafetyCheck,
  deliverOrder,
  getOrder,
  getOrderProtection,
  getOrderShipment,
  getOrderTracking,
  getProductVerifications,
  payOrder,
  requestOrderCoverage,
  requestOrderReturn,
  shipOrder,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IMAGES, INSPECTION_STEPS } from '../data/mock';
import { colors, glow, shadow } from '../theme';
import type { ChatSafetyResult, OrderItem, OrderProtection, ShipmentInfo, ShipmentTracking, VerificationItem } from '../services/api';
import type { Nav } from '../types';

const BUNDLE_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDzj_nGfzBo7QtQwKBhnSx1ENuov_qVPfyvx_YZqg1Lcloc8ake35CYfySDw9vH0_qo4vHWptdzGFVp9TEgslYgekvtQItt0DdcU9H0LgE5Sc0NXsZ6zmFA20HekCsN1mHuXDIVRAh4CMKMT9UdC64Pi_9W4HpPldUuf3n-uK0kFXB3zBVG2lh47m2kv7v1zn3DMc5tI9T1r6D-SYhBHroFfRgHCxQDkZOq7rXQJvS1IG4fep0zHcA';

const STATUS_TONE: Record<string, string> = {
  pending: colors.diagnosticAmber,
  paid: colors.accentCyan,
  in_custody: colors.accentCyan,
  shipped: colors.accentCyan,
  delivered: colors.accentEmerald,
  cancelled: colors.diagnosticRed,
  refunded: colors.diagnosticRed,
};

function statusSteps(status: string, fulfillmentStage?: OrderItem['fulfillmentStage']) {
  const base = INSPECTION_STEPS.map((s) => ({ ...s }));
  const set = (idx: number, state: 'done' | 'active' | 'pending') => {
    base[idx].state = state;
  };
  if (status === 'pending') {
    set(0, 'active');
    return base;
  }

  if (status === 'delivered') {
    base.forEach((_, idx) => set(idx, 'done'));
    return base;
  }

  if (status === 'cancelled' || status === 'refunded') {
    set(0, 'done');
    return base;
  }

  const stage = fulfillmentStage ?? (status === 'shipped' ? 'dispatch' : 'center_reception');
  const activeIndex: Record<NonNullable<OrderItem['fulfillmentStage']>, number> = {
    awaiting_payment: 0,
    center_reception: 1,
    technical_inspection: 2,
    secure_packaging: 3,
    dispatch: 4,
  };
  const current = activeIndex[stage];
  base.forEach((_, idx) => set(idx, idx < current ? 'done' : idx === current ? 'active' : 'pending'));
  return base;
}

function OrderTracking({
  order,
  protection,
  loading,
  error,
  nav,
  onUpdated,
}: {
  order: OrderItem | null;
  protection: OrderProtection | null;
  loading: boolean;
  error: string | null;
  nav: Nav;
  onUpdated: (order: OrderItem) => void;
}) {
  const { t, formatDate } = useI18n();
  const { session } = useAuth();
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnDone, setReturnDone] = useState(false);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);
  const [coverageResult, setCoverageResult] = useState<{ ticketId: string; message: string } | null>(null);
  const [verification, setVerification] = useState<VerificationItem | null>(null);
  const [shipment, setShipment] = useState<ShipmentInfo | null>(null);
  const [tracking, setTracking] = useState<ShipmentTracking | null>(null);
  const [action, setAction] = useState<'pay' | 'ship' | 'deliver' | 'cancel' | 'advance' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (
    kind: 'pay' | 'ship' | 'deliver' | 'cancel' | 'advance',
    fn: (id: string) => Promise<OrderItem>,
  ) => {
    if (!order) return;
    setAction(kind);
    setActionError(null);
    try {
      const updated = await fn(order.id);
      onUpdated(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('inspection.actionError'));
    } finally {
      setAction(null);
    }
  };

  const handleReturn = async () => {
    if (!order || returnReason.trim().length < 10) {
      setReturnError(t('inspection.errReason'));
      return;
    }
    setReturnLoading(true);
    setReturnError(null);
    try {
      const updated = await requestOrderReturn(order.id, returnReason.trim());
      setReturnDone(true);
      onUpdated(updated);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : t('inspection.errReturn'));
    } finally {
      setReturnLoading(false);
    }
  };

  const handleCoverage = async () => {
    if (!order) return;
    setCoverageLoading(true);
    setCoverageError(null);
    try {
      setCoverageResult(await requestOrderCoverage(order.id));
    } catch (err) {
      setCoverageError(err instanceof Error ? err.message : t('inspection.errCoverage'));
    } finally {
      setCoverageLoading(false);
    }
  };

  useEffect(() => {
    if (!order?.productId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getProductVerifications(order.productId!);
        if (!cancelled && list.length > 0) setVerification(list[0]);
      } catch {
        // sin verificación registrada
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [order?.productId]);

  useEffect(() => {
    if (!order?.id) return;
    let cancelled = false;
    const fetchTracking = async () => {
      try {
        const [data, track] = await Promise.all([
          getOrderShipment(order.id),
          getOrderTracking(order.id),
        ]);
        if (!cancelled) {
          setShipment(data ?? null);
          setTracking(track ?? null);
        }
      } catch {
        // sin envío registrado
      }
    };
    void fetchTracking();
    // Refresca la ubicación/ETA cada 20s (seguimiento "en vivo").
    const timer = setInterval(fetchTracking, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [order?.id, order?.status]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator color={colors.accentCyan} size="large" />
        <Text className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
          {t('inspection.loading')}
        </Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <AppIcon name="report" size={32} color={colors.diagnosticRed} />
        <Text className="text-base font-semibold text-text-primary">{t('inspection.notFound')}</Text>
        <Text className="text-center text-xs text-text-secondary">{error}</Text>
        <Pressable
          onPress={() => nav.go({ name: 'explore' })}
          className="mt-2 flex-row items-center gap-2 rounded-xl bg-primary px-5 py-3"
        >
          <Text className="text-sm font-semibold text-on-primary">{t('inspection.backMarketplace')}</Text>
        </Pressable>
      </View>
    );
  }

  const tone = STATUS_TONE[order.status] ?? colors.accentCyan;
  const statusLabel = t(`inspection.status.${order.status}`);
  const steps = statusSteps(order.status, order.fulfillmentStage);
  const activeStepIndex = steps.findIndex((step) => step.state === 'active');
  const displayedStep = activeStepIndex >= 0 ? activeStepIndex + 1 : steps.filter((step) => step.state === 'done').length;
  const product = order.product;
  const title = product?.title ?? `Orden #${order.id.slice(0, 8).toUpperCase()}`;

  const userId = session?.user?.id;
  const isAdmin = session?.user?.role === 'admin';
  const isBuyer = !!userId && order.buyerId === userId;
  const isSeller = !!userId && product?.sellerId === userId;
  const s = order.status;
  const fulfillmentStage = order.fulfillmentStage ?? (s === 'shipped' ? 'dispatch' : 'center_reception');
  const showPay = (isBuyer || isAdmin) && s === 'pending';
  const showAdvanceStage = isAdmin && (s === 'paid' || s === 'in_custody') && fulfillmentStage !== 'dispatch';
  const showShip = (isSeller || isAdmin) && (s === 'paid' || s === 'in_custody') && fulfillmentStage === 'dispatch';
  const showDeliver = (isBuyer || isAdmin) && s === 'shipped';
  const showCancel = (isBuyer || isSeller || isAdmin) && (s === 'pending' || s === 'paid');
  const showActions = showPay || showAdvanceStage || showShip || showDeliver || showCancel;
  const awaitingCenter = isBuyer && (s === 'paid' || s === 'in_custody') && fulfillmentStage !== 'dispatch';
  const awaitingShipment = isBuyer && (s === 'paid' || s === 'in_custody') && fulfillmentStage === 'dispatch';
  const awaitingDelivery = isBuyer && s === 'shipped';
  const returnableStatus = ['paid', 'in_custody', 'delivered'].includes(s);

  return (
    <>
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View className="px-4 pb-4 pt-3">
        <View className="overflow-hidden rounded-xl border border-line bg-panel p-4" style={shadow.card}>
          <View className="mb-2 flex-row items-center justify-between">
            <Pill icon="verified" tone="emerald">
              {order.status === 'in_custody' ? t('inspection.custodyActive') : statusLabel}
            </Pill>
            <Text className="font-mono text-[11px] font-medium text-text-secondary">
              ID: #{order.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
          <View className="mt-3 flex-row items-start gap-3">
            <View className="h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-700/60 bg-inset p-1">
              <ProductImage uri={product?.images?.[0]} style={{ width: '100%', height: '100%' }} iconSize={26} width={128} />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-1">
                <AppIcon name="verified" size={16} color={colors.accentCyan} />
                <Text className="font-mono text-[11px] font-semibold tracking-wide text-accent-cyan">
                  Escrow TechShield 100%
                </Text>
              </View>
              <Text className="mt-0.5 truncate text-xl leading-snug text-slate-100">{title}</Text>
              <Text className="truncate text-xs text-slate-400">
                {product?.brand ?? 'Hardware'} · {order.paymentMethod === 'crypto' ? 'Cripto' : order.paymentMethod === 'bank_transfer' ? 'Transferencia' : 'Tarjeta'}
              </Text>
            </View>
          </View>
          <View className="mt-4 flex-row items-center justify-between rounded-lg border border-line/70 bg-inset/80 p-3">
            <View>
              <Text className="block text-[11px] text-slate-400">{t('inspection.heldFunds')}</Text>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-2xl font-bold tracking-tight text-white">${Number(order.total).toFixed(2)}</Text>
                <Text className="font-mono text-[11px] text-slate-400">USD</Text>
              </View>
            </View>
            <View
              className="flex-row items-center gap-1 rounded border px-2.5 py-1"
              style={{ borderColor: tone + '66', backgroundColor: tone + '1a' }}
            >
              <AppIcon name={order.status === 'in_custody' ? 'lock' : 'verified'} size={14} color={tone} />
              <Text className="font-mono text-[11px] font-semibold" style={{ color: tone }}>
                {statusLabel.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {showActions ? (
        <View className="mb-4 px-4">
          <View className="rounded-xl border border-line bg-panel p-4" style={shadow.panel}>
            <View className="mb-3 flex-row items-center gap-1.5">
              <AppIcon name="handshake" size={20} color={colors.accentCyan} />
              <Text className="text-xl font-semibold text-slate-100">{t('inspection.actions')}</Text>
            </View>

            {awaitingShipment ? (
              <View className="mb-3 flex-row items-start gap-2 rounded-lg border border-line bg-inset p-2.5">
                <AppIcon name="local_shipping" size={16} color={colors.accentCyan} />
                <Text className="flex-1 text-xs leading-relaxed text-slate-400">
                  {t('inspection.awaitingShipment')}
                </Text>
              </View>
            ) : null}
            {awaitingDelivery ? (
              <View className="mb-3 flex-row items-start gap-2 rounded-lg border border-line bg-inset p-2.5">
                <AppIcon name="local_shipping" size={16} color={colors.accentEmerald} />
                <Text className="flex-1 text-xs leading-relaxed text-slate-400">
                  {t('inspection.awaitingDelivery')}
                </Text>
              </View>
            ) : null}

            {awaitingCenter ? (
              <View className="mb-3 flex-row items-start gap-2 rounded-lg border border-line bg-inset p-2.5">
                <AppIcon name="biotech" size={16} color={colors.accentCyan} />
                <Text className="flex-1 text-xs leading-relaxed text-slate-400">
                  {t('inspection.awaitingCenter')}
                </Text>
              </View>
            ) : null}

            {actionError ? <Text className="mb-2 text-xs text-red-400">{actionError}</Text> : null}

            <View className="flex flex-col gap-2">
              {showAdvanceStage ? (
                <Pressable
                  onPress={() => runAction('advance', advanceOrderFulfillment)}
                  disabled={!!action}
                  className="flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3"
                  style={action ? { opacity: 0.7 } : glow('#2563eb', 16, 0.3)}
                >
                  <AppIcon name={action === 'advance' ? 'sync' : 'task_alt'} size={18} color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">
                    {t(`inspection.advance.${fulfillmentStage}`)}
                  </Text>
                </Pressable>
              ) : null}
              {showPay ? (
                <Pressable
                  onPress={() => runAction('pay', payOrder)}
                  disabled={!!action}
                  className="flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3"
                  style={action ? { opacity: 0.7 } : glow('#2563eb', 16, 0.3)}
                >
                  <AppIcon name={action === 'pay' ? 'sync' : 'account_balance_wallet'} size={18} color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">{t('inspection.pay')}</Text>
                </Pressable>
              ) : null}
              {showShip ? (
                <Pressable
                  onPress={() => runAction('ship', shipOrder)}
                  disabled={!!action}
                  className="flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3"
                  style={action ? { opacity: 0.7 } : glow('#2563eb', 16, 0.3)}
                >
                  <AppIcon name={action === 'ship' ? 'sync' : 'local_shipping'} size={18} color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">{t('inspection.ship')}</Text>
                </Pressable>
              ) : null}
              {showDeliver ? (
                <Pressable
                  onPress={() => runAction('deliver', deliverOrder)}
                  disabled={!!action}
                  className="flex-row items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3"
                  style={action ? { opacity: 0.7 } : undefined}
                >
                  <AppIcon name={action === 'deliver' ? 'sync' : 'check_circle'} size={18} color={colors.accentEmerald} />
                  <Text className="text-sm font-semibold text-emerald-300">{t('inspection.deliver')}</Text>
                </Pressable>
              ) : null}
              {showCancel ? (
                <Pressable
                  onPress={() => runAction('cancel', cancelOrder)}
                  disabled={!!action}
                  className="flex-row items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 py-3"
                  style={action ? { opacity: 0.7 } : undefined}
                >
                  <AppIcon name={action === 'cancel' ? 'sync' : 'close'} size={18} color={colors.diagnosticRed} />
                  <Text className="text-sm font-semibold text-red-400">{t('inspection.cancelOrder')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {shipment ? (
        <View className="mb-4 px-4">
          <View className="rounded-xl border border-line bg-panel p-4" style={shadow.panel}>
            <View className="mb-2 flex-row items-center gap-1.5">
              <AppIcon name="local_shipping" size={20} color={colors.accentCyan} />
              <Text className="text-xl font-semibold text-slate-100">{t('shipment.title')}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-400">
                {t('shipment.carrier')}: {shipment.carrier}
              </Text>
              <View className="rounded border border-cyan-500/40 bg-cyan-950/40 px-2 py-0.5">
                <Text className="font-mono text-[10px] font-semibold text-cyan-300">
                  {shipment.trackingCode}
                </Text>
              </View>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-xs text-slate-400">
                {t('shipment.statusLabel')}: {t(`shipment.status.${shipment.status}`)}
              </Text>
              <Text className="text-xs text-slate-400">
                {t('shipment.eta', { n: shipment.estimatedDays })}
              </Text>
            </View>

            {tracking ? (
              <View className="mt-3 border-t border-line/50 pt-3">
                {tracking.mapUrl ? (
                  <View className="overflow-hidden rounded-lg border border-line/60 bg-inset">
                    <Image
                      source={{ uri: tracking.mapUrl }}
                      style={{ width: '100%', height: 170 }}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View className="items-center justify-center rounded-lg border border-dashed border-line/60 bg-inset py-6">
                    <AppIcon name="map" size={26} color={colors.textMuted} />
                    <Text className="mt-1 text-[11px] text-text-muted">
                      Mapa no disponible (configurá GOOGLE_MAPS_API_KEY)
                    </Text>
                    <Pressable
                      onPress={() =>
                        void Linking.openURL(
                          `https://www.google.com/maps/search/?api=1&query=${tracking.courier.lat},${tracking.courier.lng}`,
                        )
                      }
                      className="mt-2 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-2"
                    >
                      <Text className="text-xs font-semibold text-cyan-300">{t('tracking.openGoogleMaps')}</Text>
                    </Pressable>
                  </View>
                )}
                <View className="mt-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <AppIcon name="local_shipping" size={16} color={colors.accentCyan} />
                    <Text className="text-xs text-slate-400">{t('tracking.eta')}</Text>
                    <Text className="text-sm font-bold text-slate-100">{tracking.etaText}</Text>
                  </View>
                  <Text className="font-mono text-[11px] text-slate-400">
                    {t('tracking.remaining', { km: tracking.distanceRemainingKm })}
                  </Text>
                </View>
                <View className="mt-2">
                  <ProgressBar percent={Math.round(tracking.progress * 100)} height={6} />
                  <View className="mt-1 flex-row justify-between">
                    <Text className="font-mono text-[10px] text-text-muted">{t('tracking.origin')}</Text>
                    <Text className="font-mono text-[10px] text-accent-cyan">{t('tracking.courier')}</Text>
                    <Text className="font-mono text-[10px] text-text-muted">{t('tracking.destination')}</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Workflow tracker */}
      <View className="mb-4 px-4">
        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="science" size={20} color={colors.accentCyan} />
            <Text className="text-xl font-semibold text-slate-100">{t('inspection.trace')}</Text>
          </View>
          <View className="rounded border border-line bg-elevated px-2 py-0.5">
            <Text className="font-mono text-[11px] text-cyan-300">
              {t('inspection.phase', { n: displayedStep, total: steps.length })}
            </Text>
          </View>
        </View>

        <View className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-4" style={shadow.panel}>
          {steps.map((step, i) => (
            <View key={step.title} className="flex-row gap-3">
              <View className="flex flex-col items-center">
                <StepNode state={step.state} />
                {i < steps.length - 1 ? (
                  <View
                    className="w-0.5 flex-1"
                    style={{ backgroundColor: step.state === 'done' ? '#34d399' : '#22324f' }}
                  />
                ) : null}
              </View>
              <View className="flex-1" style={i < steps.length - 1 ? { paddingBottom: 8 } : undefined}>
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-sm ${
                      step.state === 'done'
                        ? 'font-semibold text-slate-200'
                        : step.state === 'active'
                          ? 'font-bold text-cyan-300'
                          : 'font-medium text-slate-400'
                    }`}
                  >
                    {step.title}
                  </Text>
                  <Text className="font-mono text-[11px] text-slate-500">
                    {step.state === 'active' ? 'En Curso' : step.state === 'done' ? 'Completado' : 'Pendiente'}
                  </Text>
                </View>
                <Text className="mt-0.5 text-xs text-slate-400">{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Protection */}
      {protection ? (
        <View className="mb-4 px-4">
          <View className="rounded-xl border border-line bg-panel p-4" style={shadow.panel}>
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <AppIcon name="shield_with_heart" size={20} color={colors.accentEmerald} />
                <Text className="text-xl font-semibold text-slate-100">{t('inspection.protection')}</Text>
              </View>
            </View>
            {protection.pendingPayment ? (
              <View className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5">
                <Text className="text-xs font-semibold text-amber-300">
                  Pendiente de pago
                  {typeof protection.paymentMinutesLeft === 'number'
                    ? ` · te quedan ${protection.paymentMinutesLeft} min para pagar`
                    : ''}
                </Text>
                <Text className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                  La protección de 10/45 días empieza a contar recién cuando pagues. Si no pagás, la orden expira y se libera el producto.
                </Text>
              </View>
            ) : null}
            <View className="flex-row gap-2">
              <View className="flex-1 rounded-lg border border-line bg-inset p-2.5">
                <Text className="block font-mono text-[10px] uppercase text-slate-400">{t('inspection.return')}</Text>
                <Text className="text-xl font-bold text-emerald-400">
                  {protection.pendingPayment
                    ? 'Pendiente'
                    : protection.returnWindowOpen
                      ? `${protection.returnDaysLeft} días`
                      : 'Vencida'}
                </Text>
                <Text className="mt-0.5 block text-[11px] text-slate-400">
                  {protection.escrowUntil
                    ? t('inspection.until', { date: formatDate(protection.escrowUntil) })
                    : 'Corre desde el pago'}
                </Text>
              </View>
              <View className="flex-1 rounded-lg border border-line bg-inset p-2.5">
                <Text className="block font-mono text-[10px] uppercase text-slate-400">{t('inspection.coverage')}</Text>
                <Text className="text-xl font-bold text-slate-100">
                  {protection.pendingPayment
                    ? 'Pendiente'
                    : protection.coverageActive
                      ? `${protection.coverageDaysLeft} días`
                      : 'Vencida'}
                </Text>
                <Text className="mt-0.5 block text-[11px] text-slate-400">
                  {protection.coverageUntil
                    ? t('inspection.until', { date: formatDate(protection.coverageUntil) })
                    : 'Corre desde el pago'}
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-xs leading-relaxed text-slate-400">{protection.rules.returnPolicy}</Text>

            {coverageError ? <Text className="mt-2 text-xs text-red-400">{coverageError}</Text> : null}
            {coverageResult ? (
              <View className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                <View className="flex-row items-center gap-1.5">
                  <AppIcon name="check_circle" size={16} color={colors.accentEmerald} />
                  <Text className="font-mono text-[11px] font-bold text-emerald-300">{coverageResult.ticketId}</Text>
                </View>
                <Text className="mt-1 text-xs leading-relaxed text-slate-300">{coverageResult.message}</Text>
              </View>
            ) : null}

            <View className="mt-3 flex-row gap-2">
              {protection.returnWindowOpen && returnableStatus ? (
                <Pressable
                  onPress={() => {
                    setReturnOpen(true);
                    setReturnDone(false);
                    setReturnError(null);
                  }}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 py-3"
                >
                  <AppIcon name="replay" size={18} color={colors.diagnosticRed} />
                  <Text className="text-xs font-semibold text-red-400">{t('inspection.requestReturn')}</Text>
                </Pressable>
              ) : null}
              {protection.coverageActive && order.status === 'delivered' ? (
                <Pressable
                  onPress={handleCoverage}
                  disabled={coverageLoading}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3"
                  style={coverageLoading ? { opacity: 0.7 } : undefined}
                >
                  {coverageLoading ? (
                    <AppIcon name="sync" size={18} color={colors.accentEmerald} />
                  ) : (
                    <AppIcon name="shield_with_heart" size={18} color={colors.accentEmerald} />
                  )}
                  <Text className="text-xs font-semibold text-emerald-300">{t('inspection.requestCoverage')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {/* Verificación del laboratorio */}
      {verification ? (
        <View className="mb-4 px-4">
          <View className="rounded-xl border border-[#22324f] bg-[#111a2e] p-4" style={shadow.panel}>
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <AppIcon name="biotech" size={20} color={colors.accentEmerald} />
                <Text className="text-xl font-semibold text-slate-100">{t('inspection.labReport')}</Text>
              </View>
              <View
                className={`rounded border px-2 py-0.5 ${
                  verification.result === 'pass'
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : verification.result === 'conditional'
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-red-500/40 bg-red-500/10'
                }`}
              >
                <Text
                  className="font-mono text-[11px] font-bold uppercase tracking-wider"
                  style={{
                    color:
                      verification.result === 'pass'
                        ? colors.accentEmerald
                        : verification.result === 'conditional'
                          ? colors.diagnosticAmber
                          : colors.diagnosticRed,
                  }}
                >
                  {verification.result === 'pass' ? t('inspection.approved') : verification.result === 'conditional' ? t('inspection.conditional') : t('inspection.rejected')}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              {verification.qualityScore != null ? (
                <View className="flex-1 rounded-lg border border-[#22324f] bg-[#0a0f1d] p-2.5">
                  <Text className="block font-mono text-[10px] uppercase text-slate-400">{t('inspection.quality')}</Text>
                  <Text className="text-xl font-bold text-emerald-400">{verification.qualityScore.toFixed(2)}</Text>
                </View>
              ) : null}
              {verification.hoursOfUse != null ? (
                <View className="flex-1 rounded-lg border border-[#22324f] bg-[#0a0f1d] p-2.5">
                  <Text className="block font-mono text-[10px] uppercase text-slate-400">{t('inspection.hoursOfUse')}</Text>
                  <Text className="text-xl font-bold text-slate-100">{verification.hoursOfUse} h</Text>
                </View>
              ) : null}
              {verification.cosmeticGrade ? (
                <View className="flex-1 rounded-lg border border-[#22324f] bg-[#0a0f1d] p-2.5">
                  <Text className="block font-mono text-[10px] uppercase text-slate-400">{t('inspection.cosmeticGrade')}</Text>
                  <Text className="text-xl font-bold text-accent-cyan">{verification.cosmeticGrade}</Text>
                </View>
              ) : null}
            </View>

            {verification.functionalTest ? (
              <View className="mt-2.5 rounded-lg border border-[#22324f] bg-[#0a0f1d] p-2.5">
                <Text className="font-mono text-[10px] uppercase text-slate-400">{t('inspection.functionalTest')}</Text>
                <Text className="mt-0.5 text-xs leading-relaxed text-slate-300">{verification.functionalTest}</Text>
              </View>
            ) : null}
            {verification.physicalState ? (
              <View className="mt-2.5 rounded-lg border border-[#22324f] bg-[#0a0f1d] p-2.5">
                <Text className="font-mono text-[10px] uppercase text-slate-400">{t('inspection.physicalState')}</Text>
                <Text className="mt-0.5 text-xs leading-relaxed text-slate-300">{verification.physicalState}</Text>
              </View>
            ) : null}
            {verification.notes ? (
              <Text className="mt-2.5 text-xs leading-relaxed text-slate-400">{verification.notes}</Text>
            ) : null}
            <Text className="mt-2 font-mono text-[10px] text-slate-500">
              Verificado el {formatDate(verification.createdAt)}
            </Text>
          </View>
        </View>
      ) : null}

      <View className="flex flex-col gap-2.5 px-4 pb-6">
        <Pressable
          onPress={() => nav.go({ name: 'explore' })}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3"
          style={glow('#2563eb', 20, 0.35)}
        >
          <AppIcon name="arrow_back" size={20} color="#ffffff" />
          <Text className="text-sm font-semibold text-white">{t('inspection.backMarketplace')}</Text>
        </Pressable>
      </View>
    </ScrollView>

    {/* Return request modal */}
    <Modal visible={returnOpen} transparent animationType="slide" onRequestClose={() => setReturnOpen(false)}>
      <View className="flex-1 items-center justify-end bg-black/70">
        <View className="w-full rounded-t-3xl border-t border-[#233554] bg-[#0e1626] p-5" style={shadow.bottom}>
          {returnDone ? (
            <View className="flex flex-col items-center gap-3 py-6">
              <View
                className="h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10"
                style={glow('#10b981', 18, 0.3)}
              >
                <AppIcon name="check_circle" size={34} color={colors.accentEmerald} />
              </View>
              <Text className="text-xl font-bold text-slate-100">{t('inspection.returnDone')}</Text>
              <Text className="text-center text-xs leading-relaxed text-slate-400">
                Tu dinero permanece blindado hasta que el laboratorio evalúe la devolución y revenda el producto.
              </Text>
              <Pressable
                onPress={() => setReturnOpen(false)}
                className="mt-2 w-full items-center justify-center rounded-xl bg-secondary py-3"
              >
                <Text className="text-sm font-semibold text-on-secondary">{t('common.close')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View className="flex-row items-center gap-2">
                <AppIcon name="replay" size={20} color={colors.diagnosticRed} />
                <Text className="text-lg font-semibold text-slate-100">{t('inspection.requestReturn')}</Text>
              </View>
              <Text className="mt-1 text-xs leading-relaxed text-slate-400">
                Estás dentro de la ventana de devolución de 10 días. Contanos el motivo para que el laboratorio evalúe.
              </Text>
              <TextInput
                value={returnReason}
                onChangeText={setReturnReason}
                placeholder={t('inspection.returnPh')}
                placeholderTextColor={colors.textMuted}
                multiline
                className="mt-3 min-h-[90px] rounded-xl border border-[#22324f] bg-[#111a2e] p-3 text-sm text-slate-100"
              />
              {returnError ? <Text className="mt-2 text-xs text-red-400">{returnError}</Text> : null}
              <View className="mt-4 flex-row gap-2">
                <Pressable
                  onPress={() => setReturnOpen(false)}
                  className="flex-1 items-center justify-center rounded-xl border border-[#22324f] bg-[#111a2e] py-3"
                >
                  <Text className="text-sm font-semibold text-slate-400">{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleReturn}
                  disabled={returnLoading}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-red-500 py-3"
                  style={returnLoading ? { opacity: 0.7 } : undefined}
                >
                  {returnLoading ? (
                    <AppIcon name="sync" size={18} color="#ffffff" />
                  ) : (
                    <AppIcon name="replay" size={18} color="#ffffff" />
                  )}
                  <Text className="text-sm font-semibold text-white">{t('inspection.returnConfirm')}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
    </>
  );
}

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
    <View className="h-7 w-7 items-center justify-center rounded-full border border-line bg-elevated">
      <AppIcon name="inventory_2" size={16} color="#64748b" />
    </View>
  );
}

export default function InspectionScreen({ nav, orderId }: { nav: Nav; orderId?: string }) {
  const { t } = useI18n();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatChecking, setChatChecking] = useState(false);
  const [chatResult, setChatResult] = useState<ChatSafetyResult | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const [order, setOrder] = useState<OrderItem | null>(null);
  const [protection, setProtection] = useState<OrderProtection | null>(null);
  const [orderLoading, setOrderLoading] = useState(!!orderId);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const [o, p] = await Promise.all([getOrder(orderId), getOrderProtection(orderId)]);
        if (cancelled) return;
        setOrder(o);
        setProtection(p);
      } catch (err) {
        if (!cancelled) setOrderError(err instanceof Error ? err.message : t('inspection.notFound'));
      } finally {
        if (!cancelled) setOrderLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, t]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    const timer = setInterval(() => {
      void getOrder(orderId)
        .then((current) => {
          if (!cancelled) setOrder(current);
        })
        .catch(() => undefined);
      void getOrderProtection(orderId)
        .then((p) => {
          if (!cancelled) setProtection(p);
        })
        .catch(() => undefined);
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderId]);

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

  // Demo mode (sin orderId): pasos estáticos para el tracker de la vista de muestra.
  // Sin esto, `steps` / `displayedStep` usados en el JSX de abajo lanzan "steps is not defined".
  const steps = statusSteps(order?.status ?? 'in_custody', order?.fulfillmentStage ?? 'technical_inspection');
  const demoActiveIndex = steps.findIndex((step) => step.state === 'active');
  const displayedStep =
    demoActiveIndex >= 0 ? demoActiveIndex + 1 : steps.filter((step) => step.state === 'done').length || steps.length;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="Verified Orders" activeTab />

      {orderId ? (
        <OrderTracking
          order={order}
          protection={protection}
          loading={orderLoading}
          error={orderError}
          nav={nav}
          onUpdated={(o) => {
            setOrder(o);
            // Cada acción (pagar/cancelar/devolver) cambia la protección:
            // se refresca junto con la orden para no mostrar estados viejos.
            getOrderProtection(o.id)
              .then((p) => setProtection(p))
              .catch(() => undefined);
          }}
        />
      ) : (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status aura banner */}
        <View className="px-4 pb-4 pt-3">
          <View
            className="overflow-hidden rounded-xl border border-line bg-panel p-4"
            style={shadow.card}
          >
            <View className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10" />
            <View className="mb-2 flex-row items-center justify-between">
              <Pill icon="verified" tone="emerald">Custodia Activa</Pill>
              <Text className="font-mono text-[11px] font-medium text-text-secondary">ID: TS-40922-LAB</Text>
            </View>
            <View className="mt-3 flex-row items-start gap-3">
              <View className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-700/60 bg-inset p-1">
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
              className="mt-4 flex-row items-center justify-between rounded-lg border border-line/70 bg-inset/80 p-3"
            >
              <View>
                <Text className="block text-[11px] text-slate-400">{t('inspection.heldFunds')}</Text>
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
          <View className="flex-row items-center gap-3 rounded-xl border border-line bg-panel p-3" style={shadow.panel}>
            <View className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-cyan-500/40 bg-inset p-0.5">
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
              className="flex-row items-center gap-1 rounded-lg border border-cyan-500/30 bg-elevated px-3 py-1.5"
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
              <Text className="text-xl font-semibold text-slate-100">{t('inspection.trace')}</Text>
            </View>
            <View className="rounded border border-line bg-elevated px-2 py-0.5">
              <Text className="font-mono text-[11px] text-cyan-300">{t('inspection.phase', { n: displayedStep, total: steps.length })}</Text>
            </View>
          </View>

          <View className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-4" style={shadow.panel}>
            {steps.map((step, i) => (
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
                    <View className="mt-3 flex flex-col gap-2 rounded-lg border border-line bg-inset p-2.5">
                      {step.checkpoints.map((cp) => (
                        <View
                          key={cp.title}
                          className="flex-row items-center justify-between rounded border border-line/60 bg-panel/90 px-2.5 py-1.5"
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
          <View className="rounded-xl border border-line bg-panel p-4" style={shadow.panel}>
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <AppIcon name="equalizer" size={20} color={colors.accentEmerald} />
                <Text className="text-xl font-semibold text-slate-100">Telemetría de la Muestra</Text>
              </View>
              <View className="rounded border border-line bg-inset px-2 py-0.5">
                <Text className="font-mono text-[11px] text-slate-400">Hash: #9a4f-88e2</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1 rounded-lg border border-line bg-inset p-2.5">
                <Text className="block font-mono text-[10px] uppercase text-slate-400">Temp Max</Text>
                <Text className="text-xl font-bold text-emerald-400">67.4°C</Text>
                <Text className="mt-0.5 block text-[11px] text-emerald-300/80">Óptimo (&lt;85°C)</Text>
              </View>
              <View className="flex-1 rounded-lg border border-line bg-inset p-2.5">
                <Text className="block font-mono text-[10px] uppercase text-slate-400">Multi-Core</Text>
                <Text className="text-xl font-bold text-slate-100">14,890</Text>
                <Text className="mt-0.5 block text-[11px] text-slate-400">Pts R23 Cinebench</Text>
              </View>
              <View className="flex-1 rounded-lg border border-line bg-inset p-2.5">
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
            className="flex-row items-center justify-between rounded-xl border border-line bg-panel p-4"
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
            className="flex-row items-center justify-center gap-2 rounded-xl border border-line bg-panel py-3"
          >
            <AppIcon name="contact_support" size={20} color={colors.accentCyan} />
            <Text className="text-sm font-semibold text-slate-200">
              Solicitar Videollamada de Comprobación en Vivo
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      )}

      {/* Chat safety modal */}
      <Modal visible={chatOpen} transparent animationType="slide" onRequestClose={() => setChatOpen(false)}>
        <View className="flex-1 items-center justify-end bg-black/70">
          <View className="w-full rounded-t-3xl border-t border-line bg-panel p-5" style={shadow.bottom}>
            <View className="flex-row items-center gap-2">
              <AppIcon name="chat" size={20} color={colors.accentCyan} />
              <Text className="text-lg font-semibold text-text-primary">Chat seguro</Text>
            </View>

            <View className="mt-3 flex flex-col gap-1.5 rounded-xl border border-line bg-panel p-3">
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
              className="mt-3 min-h-[70px] rounded-xl border border-line bg-panel p-3 text-sm text-text-primary"
            />

            {chatError ? <Text className="mt-2 text-xs text-diagnostic-red">{chatError}</Text> : null}

            {chatResult ? (
              <View
                className="mt-3 rounded-xl border p-3"
                style={{
                  borderColor: chatResult.safe ? colors.secondary + '66' : colors.diagnosticAmber + '66',
                  backgroundColor: chatResult.safe ? colors.successSoft : colors.warningSoft,
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
                className="flex-1 items-center justify-center rounded-xl border border-line bg-panel py-3"
              >
                <Text className="text-sm font-semibold text-text-secondary">{t('common.close')}</Text>
              </Pressable>
              <Pressable
                onPress={handleChatCheck}
                disabled={chatChecking}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-accent-cyan py-3"
                style={chatChecking ? { opacity: 0.7 } : undefined}
              >
                {chatChecking ? <AppIcon name="sync" size={16} color="#06222e" /> : <AppIcon name="verified" size={16} color="#06222e" />}
                <Text className="text-sm font-semibold text-on-tertiary">Analizar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNav active="inspection" onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}

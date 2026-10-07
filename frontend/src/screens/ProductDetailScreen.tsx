import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import AppIcon from '../components/AppIcon';
import ProductImage from '../components/ProductImage';
import { Avatar, ProgressBar } from '../components/ui';
import { createOrder, createReport, getSellerReviews, getTrustBadge } from '../services/api';
import type { OrderItem, ReviewItem, SecurityProfile } from '../services/api';
import { useTrack } from '../hooks/useTrack';
import { IMAGES } from '../data/mock';
import { colors, glow, shadow } from '../theme';
import type { ExploreCard, Nav, SellerTier } from '../types';

const tierMeta: Record<SellerTier, { label: string; cls: string; dot: string }> = {
  secure: {
    label: 'VENDEDOR SEGURO',
    cls: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    dot: colors.accentEmerald,
  },
  normal: {
    label: 'VENDEDOR NORMAL',
    cls: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    dot: colors.accentCyan,
  },
  not_secure: {
    label: 'VENDEDOR NO SEGURO',
    cls: 'border-red-500/40 bg-red-500/10 text-red-400',
    dot: colors.diagnosticRed,
  },
};

function CheckedBanner() {
  return (
    <View
      className="flex-row items-center gap-2.5 rounded-xl border border-secondary/40 bg-secondary/10 p-3"
      style={glow(colors.secondary, 12, 0.2)}
    >
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-secondary/20">
        <AppIcon name="verified" size={20} color={colors.accentEmerald} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold uppercase tracking-wide text-emerald-300">Chequeado para Compra</Text>
        <Text className="mt-0.5 text-xs text-text-secondary">
          Este producto pasó las revisiones y testeos del laboratorio. Podés ver los datos reales abajo y compararlos
          con lo declarado por el vendedor.
        </Text>
      </View>
    </View>
  );
}

function VerificationData({ product }: { product: ExploreCard }) {
  const { verified } = product;
  if (!verified) {
    return (
      <View className="px-4 pt-4">
        <View className="flex-row items-start gap-3 rounded-xl border border-line bg-panel p-4">
          <AppIcon name="science" size={22} color={colors.diagnosticAmber} style={{ marginTop: 2 }} />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-text-primary">Producto en auditoría</Text>
            <Text className="mt-0.5 text-xs leading-relaxed text-text-secondary">
              Este producto aún no tiene el check del laboratorio. Sin el chequeo no se muestran los datos reales de
              horas de uso, tipo de uso ni estrés soportado.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const real = product.hoursOfUse;
  const reported = product.reportedHoursOfUse;
  const hasComparison = real != null && reported != null;
  const diff =
    hasComparison && real !== null && reported !== null
      ? Math.abs(real - reported)
      : 0;
  const match = hasComparison && diff <= Math.max(20, (reported ?? 0) * 0.2);
  const variancePct =
    hasComparison && real !== null && reported !== null && reported > 0
      ? Math.round((diff / reported) * 100)
      : 0;

  return (
    <View className="px-4 pt-4">
      <View className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4" style={shadow.panel}>
        <View className="flex-row items-center gap-2">
          <AppIcon name="hardware" size={20} color={colors.accentCyan} />
          <Text className="text-lg font-semibold text-text-primary">Datos Reales del Producto</Text>
        </View>

        {hasComparison ? (
          <View className="flex-col gap-1.5 rounded-lg border border-line/60 bg-elevated p-2.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-text-secondary">Horas de uso verificadas</Text>
              <Text className="font-mono text-sm font-bold text-secondary">
                {real != null ? `${real} h` : '—'}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-text-secondary">Declarado por el vendedor</Text>
              <Text className="font-mono text-xs text-text-primary">{reported != null ? `${reported} h` : '—'}</Text>
            </View>
            <View
              className="mt-1 flex-row items-center justify-between rounded border px-2 py-1"
              style={{
                borderColor: match ? colors.secondary + '66' : colors.diagnosticAmber + '66',
                backgroundColor: match ? colors.successSoft : colors.warningSoft,
              }}
            >
              <Text className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: match ? colors.accentEmerald : colors.diagnosticAmber }}>
                {match ? 'Coincide con lo declarado' : `Discrepancia detectada (${variancePct}%)`}
              </Text>
              <AppIcon name={match ? 'check_circle' : 'notifications_active'} size={14} color={match ? colors.accentEmerald : colors.diagnosticAmber} />
            </View>
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          {product.usageType ? (
            <View className="flex-1 min-w-[45%] flex-col gap-1 rounded-lg border border-line/60 bg-surface p-2.5">
              <Text className="font-mono text-[10px] uppercase text-text-muted">Tipo de uso</Text>
              <Text className="text-xs font-semibold text-text-primary">{product.usageType}</Text>
            </View>
          ) : null}
          {product.conditionGrade ? (
            <View className="flex-1 min-w-[45%] flex-col gap-1 rounded-lg border border-line/60 bg-surface p-2.5">
              <Text className="font-mono text-[10px] uppercase text-text-muted">Grado</Text>
              <Text className="text-xs font-semibold text-secondary">{product.conditionGrade}</Text>
            </View>
          ) : null}
        </View>

        {product.stressTest ? (
          <View className="flex-col gap-1 rounded-lg border border-line/60 bg-surface p-2.5">
            <Text className="font-mono text-[10px] uppercase text-text-muted">Estrés soportado</Text>
            <Text className="text-xs leading-relaxed text-text-secondary">{product.stressTest}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const badgeMeta: Record<SecurityProfile['badge'], { label: string; cls: string; dot: string }> = {
  safe: {
    label: 'VENDEDOR SEGURO',
    cls: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    dot: colors.accentEmerald,
  },
  intermediate: {
    label: 'VENDEDOR NORMAL',
    cls: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    dot: colors.accentCyan,
  },
  unsafe: {
    label: 'VENDEDOR NO SEGURO',
    cls: 'border-red-500/40 bg-red-500/10 text-red-400',
    dot: colors.diagnosticRed,
  },
};

function SellerSecurity({
  product,
  onReport,
  onViewReviews,
}: {
  product: ExploreCard;
  onReport?: () => void;
  onViewReviews?: () => void;
}) {
  const [badge, setBadge] = useState<SecurityProfile | null>(null);

  useEffect(() => {
    if (!product.sellerId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getTrustBadge(product.sellerId!);
        if (!cancelled) setBadge(data);
      } catch {
        // conservar fallback con sellerStats del producto
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product.sellerId]);

  const fallbackTier = product.sellerTier;
  const meta = badge ? badgeMeta[badge.badge] : fallbackTier ? tierMeta[fallbackTier] : null;
  if (!meta) return null;

  const stats = badge
    ? {
        positivity: badge.positivity,
        complaints: badge.complaints,
        total: badge.totalReviews,
        identityVerified: badge.identityVerified,
        acceptsTesting: badge.acceptsTesting,
      }
    : {
        positivity: product.sellerStats?.positivity ?? 0,
        complaints: product.sellerStats?.complaints ?? 0,
        total: product.sellerStats?.total ?? 0,
        identityVerified: product.identityVerified ?? false,
        acceptsTesting: fallbackTier === 'secure',
      };

  const breakdown = badge?.breakdown;
  const maxBreakdown = breakdown ? Math.max(1, breakdown.positive, breakdown.neutral, breakdown.complaint) : 1;

  return (
    <View className="px-4 pt-4">
      <View className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4" style={shadow.panel}>
        <View className="flex-row items-center gap-2">
          <AppIcon name="verified_user" size={20} color={meta.dot} />
          <Text className="text-lg font-semibold text-text-primary">Seguridad del Vendedor</Text>
        </View>
        <View className="flex-row flex-wrap items-center gap-1.5">
          <View className={`flex-row items-center gap-1.5 rounded border px-2.5 py-1 ${meta.cls}`}>
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
            <Text className="font-mono text-[11px] font-bold tracking-wider">{meta.label}</Text>
          </View>
          {stats.identityVerified ? (
            <View className="flex-row items-center gap-1 rounded border border-sky-500/40 bg-sky-950/50 px-2 py-1">
              <AppIcon name="badge" size={13} color="#7dd3fc" />
              <Text className="font-mono text-[11px] font-bold tracking-wider text-sky-300">ID VERIFICADO</Text>
            </View>
          ) : null}
        </View>

        {badge ? (
          <View className="mt-1 flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <AppIcon name="star" size={18} color={colors.diagnosticAmber} />
              <Text className="text-lg font-bold text-text-primary">{badge.averageRating.toFixed(1)}</Text>
            </View>
            <Text className="font-mono text-[11px] text-text-secondary">
              {badge.totalReviews} reseñas · {badge.positivity}% positivas · {badge.complaintRate}% quejas
            </Text>
          </View>
        ) : null}

        <Text className="text-xs leading-relaxed text-text-secondary">
          {product.sellerName ?? 'Vendedor'} · positividad{' '}
          <Text className="font-bold text-text-primary">{stats.positivity}%</Text> · {stats.total} reseñas ·{' '}
          {stats.complaints} quejas.
        </Text>

        {breakdown ? (
          <View className="mt-1 flex flex-col gap-1.5">
            <View className="h-1.5 w-full flex-row overflow-hidden rounded-full bg-elevated">
              <View className="h-full bg-emerald-500" style={{ flex: breakdown.positive / maxBreakdown }} />
              <View className="h-full bg-amber-500" style={{ flex: breakdown.neutral / maxBreakdown }} />
              <View className="h-full bg-red-500" style={{ flex: breakdown.complaint / maxBreakdown }} />
            </View>
            <View className="flex-row justify-between">
              <Text className="font-mono text-[10px] text-emerald-400">
                {breakdown.positive} positivas
              </Text>
              <Text className="font-mono text-[10px] text-amber-400">{breakdown.neutral} neutrales</Text>
              <Text className="font-mono text-[10px] text-red-400">{breakdown.complaint} quejas</Text>
            </View>
          </View>
        ) : null}

        <Text className="text-xs leading-relaxed text-text-secondary">
          {stats.acceptsTesting
            ? 'Acepta todas las revisiones y testeos del producto antes de venderlo.'
            : 'Acepta pocas o ninguna revisión y testeo antes de vender.'}
        </Text>
        {onViewReviews ? (
          <Pressable
            onPress={onViewReviews}
            className="mt-1 flex-row items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 py-2.5"
          >
            <AppIcon name="star" size={16} color={colors.diagnosticAmber} />
            <Text className="text-xs font-semibold text-amber-400">Ver reseñas del vendedor</Text>
          </Pressable>
        ) : null}
        {onReport ? (
          <Pressable
            onPress={onReport}
            className="mt-1 flex-row items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 py-2.5"
          >
            <AppIcon name="report" size={16} color={colors.diagnosticRed} />
            <Text className="text-xs font-semibold text-red-400">Reportar a este vendedor</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function ProductDetailScreen({ nav, product }: { nav: Nav; product: ExploreCard }) {
  const trackEvent = useTrack();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderItem | null>(null);

  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [sellerReviews, setSellerReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const openSellerReviews = async () => {
    if (!product.sellerId) return;
    setReviewsOpen(true);
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      setSellerReviews(await getSellerReviews(product.sellerId));
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : 'No se pudieron cargar las reseñas.');
    } finally {
      setReviewsLoading(false);
    }
  };

  const gallery = product.gallery ?? [];
  const activeImage = gallery[galleryIndex]?.uri ?? product.image;
  const marker = gallery[galleryIndex]?.desc ?? 'Inspección macro: Chasis frontal';

  const handleBuy = () => {
    setCheckoutOpen(true);
    setOrderError(null);
    setCreatedOrder(null);
  };

  const handlePlaceOrder = async () => {
    if (!shippingAddress.trim()) {
      setOrderError('Ingresá la dirección de envío.');
      return;
    }
    setPlacing(true);
    setOrderError(null);
    try {
      const order = await createOrder({
        productId: product.id,
        shippingAddress: shippingAddress.trim(),
        paymentMethod,
      });
      setCreatedOrder(order);
      trackEvent('purchase', {
        orderId: order.id,
        productId: product.id,
        metadata: { total: Number(order.total), paymentMethod },
      });
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'No se pudo crear la orden.');
    } finally {
      setPlacing(false);
    }
  };

  const handleReport = async () => {
    if (!product.sellerId || reportReason.trim().length < 10) {
      setReportError('Escribí un motivo de al menos 10 caracteres.');
      return;
    }
    setReportSending(true);
    setReportError(null);
    try {
      await createReport(product.sellerId, 'seller', reportReason.trim());
      setReportReason('');
      setTimeout(() => setReportOpen(false), 900);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'No se pudo enviar el reporte.');
    } finally {
      setReportSending(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View
        className="flex-row items-center justify-between bg-surface px-4 py-2.5"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.line, ...shadow.top }}
      >
        <View className="flex-row items-center gap-2">
          <Pressable onPress={nav.back} className="h-10 w-10 items-center justify-center rounded-lg">
            <AppIcon name="arrow_back" size={22} color={colors.onSurface} />
          </Pressable>
          <View className="h-7 w-7 items-center justify-center overflow-hidden rounded-lg">
            <ProductImage uri={IMAGES.logo} style={{ width: 28, height: 28 }} iconSize={16} contentFit="contain" />
          </View>
          <Text className="ml-1 truncate text-base font-semibold text-text-primary">Hardware Diagnostic Detail</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="flex-row items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1">
            <AppIcon name="verified" size={14} color={colors.secondary} />
            <Text className="font-mono text-[11px] tracking-wide text-secondary">TECHSHIELD</Text>
          </View>
          <Avatar uri={IMAGES.profile} size={32} ringColor={colors.secondary + '66'} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Breadcrumb */}
        <View className="flex-row items-center justify-between px-4 pb-1 pt-2">
          <View className="flex-row items-center gap-1.5">
            <Text className="font-mono text-[11px] text-text-secondary">{product.category}</Text>
            <Text className="font-mono text-[11px] text-text-secondary">/</Text>
            <Text className="font-mono text-[11px] font-semibold text-primary">{product.breadcrumb}</Text>
          </View>
          <View className="flex-row items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-0.5">
            <AppIcon name="verified" size={14} color={colors.secondary} />
            <Text className="font-mono text-[11px] font-semibold text-secondary">AUDITORÍA ACTIVA</Text>
          </View>
        </View>

        {/* Gallery */}
        <View className="px-4 pt-1">
          <View
            className="overflow-hidden rounded-xl border border-line bg-card"
            style={shadow.card}
          >
            <View className="overflow-hidden bg-inset" style={{ aspectRatio: 4 / 3 }}>
              <ProductImage
                uri={activeImage}
                style={{ width: '100%', height: '100%' }}
                iconSize={56}
                contentFit="cover"
              />
              <View className="absolute left-3 top-3 flex-row items-center gap-1.5 rounded-full border border-secondary/40 bg-surface/90 px-2.5 py-1">
                <AppIcon name="verified_user" size={15} color={colors.secondary} />
                <Text className="font-mono text-[11px] font-semibold tracking-wider text-secondary">
                  LAB PHOTO #{String(galleryIndex + 1).padStart(2, '0')} • TECHSHIELD CERTIFIED
                </Text>
              </View>
              <View className="absolute bottom-3 right-3 flex-row items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1">
                <View className="h-2 w-2 rounded-full bg-secondary" />
                <Text className="font-mono text-[11px] text-text-primary">{marker}</Text>
              </View>
            </View>
            {gallery.length > 0 ? (
              <View className="flex-row items-center gap-2 overflow-hidden border-t border-line/50 bg-inset p-2">
                {gallery.map((g, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setGalleryIndex(i)}
                    className="relative h-16 w-16 overflow-hidden rounded-lg bg-card"
                    style={i === galleryIndex ? { borderWidth: 2, borderColor: colors.secondary } : undefined}
                  >
                    <ProductImage uri={g.uri} style={{ width: '100%', height: '100%' }} iconSize={22} />
                    <View
                      className="absolute inset-x-0 bottom-0 items-center py-0.5"
                      style={{ backgroundColor: colors.surface + 'e6' }}
                    >
                      <Text
                        className={`font-mono text-[9px] font-medium ${
                          i === galleryIndex ? 'text-text-primary' : 'text-text-secondary'
                        }`}
                      >
                        {g.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* Badges */}
        <View className="flex-row flex-wrap items-center gap-2 px-4 pt-4">
          <View className="flex-row items-center gap-1.5 rounded-full border border-secondary/35 bg-secondary/15 px-3 py-1">
            <AppIcon name="verified" size={16} color={colors.secondary} />
            <Text className="font-mono text-[11px] font-semibold tracking-wide text-secondary">
              USADO - {product.grade}
            </Text>
          </View>
{product.condition === 'new' ? (
          <View className="flex-row items-center gap-1.5 rounded-full border border-sky-400/60 bg-info-soft px-3 py-1">
            <AppIcon name="inventory_2" size={15} color="#7dd3fc" />
            <Text className="font-mono text-[11px] font-bold tracking-wide text-sky-300">NUEVO · SIN USO · SIN ABRIR</Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-1.5 rounded-full border border-line bg-elevated px-3 py-1">
          <AppIcon name="inventory_2" size={15} color={colors.primary} />
          <Text className="font-mono text-[11px] text-on-surface-variant">CAJA ORIGINAL + ACCESORIOS</Text>
        </View>
      </View>

        {product.verified ? <CheckedBanner /> : null}

        {/* Title */}
        <View className="px-4 pt-2">
          <Text className="text-[28px] font-bold leading-tight tracking-tight text-text-primary">{product.title}</Text>
          <Text className="mt-1 text-sm text-text-secondary">{product.intro}</Text>
        </View>

        {/* Price */}
        <View className="px-4 pt-3">
          <View className="flex flex-col gap-1 rounded-xl border border-line bg-card p-4" style={shadow.panel}>
            <View className="flex-row items-baseline justify-between">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-[28px] font-bold text-text-primary">${product.price}</Text>
                <Text className="font-mono text-[11px] font-semibold text-text-secondary">{product.currency}</Text>
                {product.originalPrice ? (
                  <Text className="ml-1 text-xs text-text-muted line-through">${product.originalPrice} nuevo</Text>
                ) : null}
              </View>
              {product.saving ? (
                <View className="rounded-full border border-secondary/40 bg-secondary/20 px-2.5 py-0.5">
                  <Text className="font-mono text-[11px] font-bold text-secondary">{product.saving}</Text>
                </View>
              ) : null}
            </View>
            {product.shipping ? (
              <View className="flex-row items-center gap-2 pt-1">
                <AppIcon name="local_shipping" size={18} color={colors.secondary} />
                <Text className="text-xs font-medium text-secondary">{product.shipping}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {product.priceFlag === 'suspicious' ? (
          <View className="mx-4 mt-3 flex-row items-start gap-2.5 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <AppIcon name="notifications_active" size={18} color={colors.diagnosticAmber} />
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wide text-amber-300">Precio sospechoso</Text>
              <Text className="mt-0.5 text-xs leading-relaxed text-amber-200/90">
                Está un {Math.abs(product.priceDiffPct ?? 0)}% por debajo del promedio de mercado ($
                {product.marketAveragePrice}). Verificá bien antes de comprar.
              </Text>
            </View>
          </View>
        ) : null}

        {product.warranty ? (
          <View className="px-4 pt-4">
            <View className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4" style={shadow.panel}>
              <View className="flex-row items-center gap-2">
                <AppIcon
                  name="security"
                  size={20}
                  color={product.warranty.extended ? colors.accentCyan : colors.accentEmerald}
                />
                <Text className="text-lg font-semibold text-text-primary">Garantía / Cobertura</Text>
              </View>
              <View
                className={`self-start flex-row items-center gap-1.5 rounded border px-2.5 py-1 ${
                  product.warranty.extended ? 'border-cyan-500/40 bg-cyan-950/40' : 'border-emerald-500/40 bg-emerald-500/10'
                }`}
              >
                <AppIcon
                  name="verified"
                  size={13}
                  color={product.warranty.extended ? colors.accentCyan : colors.accentEmerald}
                />
                <Text
                  className="font-mono text-[11px] font-bold tracking-wider"
                  style={{ color: product.warranty.extended ? '#67e8f9' : colors.accentEmerald }}
                >
                  {product.warranty.extended
                    ? 'COBERTURA EXTENDIDA'
                    : `GARANTÍA TECHSHIELD ${product.warranty.days} DÍAS`}
                </Text>
              </View>
              <Text className="text-xs leading-relaxed text-text-secondary">
                {product.warranty.label}. Cobertura de la empresa hasta 45 días desde la compra: un técnico de
                TechShield puede revisar o reparar el producto.
              </Text>
            </View>
          </View>
        ) : null}

        <VerificationData product={product} />

        {/* Report */}
        {product.report ? (
          <View className="px-4 pt-4">
            <View className="flex flex-col gap-4 rounded-xl border border-line bg-card p-4" style={shadow.panel}>
              {/* Report header */}
              <View
                className="-m-4 mb-0 flex-row items-start justify-between gap-2 rounded-t-xl border-b border-line bg-elevated/70 p-4"
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="h-10 w-10 shrink-0 items-center justify-center rounded-full border border-secondary/40 bg-secondary/20"
                    style={shadow.panel}
                  >
                    <AppIcon name="task_alt" size={24} color={colors.secondary} />
                  </View>
                  <View>
                    <Text className="text-xl font-semibold text-text-primary">Reporte Técnico Oficial</Text>
                    <Text className="font-mono text-[11px] text-text-secondary">{product.report.code}</Text>
                  </View>
                </View>
                <View className="rounded-full border border-line bg-surface px-2.5 py-1">
                  <Text className="font-mono text-[10px] font-semibold tracking-wider text-tertiary">
                    {product.report.tests}
                  </Text>
                </View>
              </View>

              {/* Battery */}
              {product.report.battery ? (
                <View className="flex flex-col gap-2 rounded-lg border border-line/70 bg-elevated p-2.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <AppIcon name="battery_charging_full" size={18} color={colors.secondary} />
                      <Text className="font-mono text-[11px] font-semibold text-text-primary">
                        {product.report.battery.label}
                      </Text>
                    </View>
                    <Text className="font-mono text-base font-bold tracking-wide text-secondary">
                      {product.report.battery.value}
                    </Text>
                  </View>
                  <ProgressBar percent={product.report.battery.percent} height={10} />
                  <View className="flex-row items-center justify-between">
                    <Text className="font-mono text-[11px] text-text-secondary">
                      {product.report.battery.subLeft}
                    </Text>
                    <Text className="font-mono text-[11px] text-text-secondary">
                      {product.report.battery.subRight}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Checklist */}
              {product.report.checklist ? (
                <View className="flex flex-col gap-2.5">
                  {product.report.checklist.map((item) => (
                    <View key={item.title} className="flex-row items-start gap-3 rounded-lg border border-line/60 bg-elevated p-2.5">
                      <AppIcon name={item.icon} size={20} color={colors.secondary} style={{ marginTop: 2 }} />
                      <View className="min-w-0 flex-1">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm font-semibold text-text-primary">{item.title}</Text>
                          <View className="rounded border border-secondary/30 bg-secondary/10 px-2 py-0.5">
                            <Text className="font-mono text-[11px] font-bold text-secondary">{item.status}</Text>
                          </View>
                        </View>
                        <Text className="mt-0.5 text-xs text-text-secondary">{item.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Hash */}
              <View className="flex-row items-center justify-between pt-1">
                <Text className="font-mono text-[11px] text-text-muted">{product.report.hash}</Text>
                <Pressable className="flex-row items-center gap-0.5">
                  <Text className="text-[11px] font-semibold text-primary">Ver informe PDF</Text>
                  <AppIcon name="open_in_new" size={14} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        <SellerSecurity
          product={product}
          onReport={product.sellerId ? () => setReportOpen(true) : undefined}
          onViewReviews={product.sellerId ? openSellerReviews : undefined}
        />

        {/* Seller */}
        {product.seller ? (
          <View className="px-4 pt-4">
            <View className="flex-row items-center justify-between gap-3 rounded-xl border border-line bg-card p-4" style={shadow.panel}>
              <View className="flex-row items-center gap-3">
                <View className="relative">
                  <Avatar uri={product.seller.avatar} size={48} ringColor={colors.line} />
                  <View className="absolute -bottom-1 -right-1 h-4 w-4 items-center justify-center rounded-full bg-secondary">
                    <Text className="text-[10px] font-bold text-on-secondary">✓</Text>
                  </View>
                </View>
                <View>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-xl font-semibold text-text-primary">{product.seller.name}</Text>
                    {product.seller.pro ? (
                      <View className="rounded border border-primary/30 bg-primary/20 px-1.5 py-0.5">
                        <Text className="font-mono text-[10px] font-bold text-primary">PRO</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="text-xs text-text-secondary">{product.seller.since}</Text>
                </View>
              </View>
              <View className="shrink-0 items-end">
                <View className="flex-row items-center gap-1">
                  <AppIcon name="star" size={16} color={colors.diagnosticAmber} />
                  <Text className="font-mono text-[11px] font-semibold text-text-primary">{product.seller.rating}</Text>
                </View>
                <Text className="font-mono text-[11px] font-medium text-secondary">{product.seller.positive}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Garantía */}
        <View className="px-4 pt-4">
          <View className="flex flex-col gap-4 rounded-xl border border-line bg-card p-4" style={shadow.panel}>
            <View className="flex-row items-center gap-2">
              <AppIcon name="security" size={22} color={colors.secondary} />
              <Text className="text-xl font-semibold text-text-primary">Garantía TechShield Total</Text>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1 flex-col gap-1 rounded-lg border border-line/60 bg-surface p-2.5">
                <View className="flex-row items-center gap-1.5">
                  <AppIcon name="verified" size={16} color={colors.secondary} />
                  <Text className="font-mono text-[11px] font-semibold text-secondary">90 DÍAS</Text>
                </View>
                <Text className="text-xs text-text-secondary">
                  Garantía de hardware completa gestionada directamente por TechShield.
                </Text>
              </View>
              <View className="flex-1 flex-col gap-1 rounded-lg border border-line/60 bg-surface p-2.5">
                <View className="flex-row items-center gap-1.5">
                  <AppIcon name="replay" size={16} color={colors.secondary} />
                  <Text className="font-mono text-[11px] font-semibold text-secondary">14 DÍAS</Text>
                </View>
                <Text className="text-xs text-text-secondary">
                  Devolución sin preguntas si no cumple con la descripción técnica.
                </Text>
              </View>
            </View>
            <View className="flex-row items-start gap-2.5 rounded-lg border border-line/60 bg-surface p-2.5">
              <AppIcon name="account_balance_wallet" size={20} color={colors.primary} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="font-mono text-[11px] font-bold text-primary">
                  PAGO PROTEGIDO EN CUSTODIA (ESCROW)
                </Text>
                <Text className="mt-0.5 text-xs text-text-secondary">
                  Tu dinero se mantiene seguro y congelado en TechShield. El vendedor no cobra hasta que recibas el
                  equipo y verifiques su estado.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Specs */}
        {product.specs ? (
          <View className="px-4 pt-4">
            <View className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4" style={shadow.panel}>
              <Text className="text-xl font-semibold text-text-primary">Especificaciones Validadas</Text>
              {product.specs.map(([label, value], i) => (
                <View
                  key={label}
                  className="flex-row items-center justify-between py-2"
                  style={i < product.specs!.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.line } : undefined}
                >
                  <Text className="font-mono text-[11px] text-text-secondary">{label}</Text>
                  <Text className="font-mono text-[11px] font-semibold text-text-primary">{value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Report modal */}
      <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full rounded-2xl border border-line bg-panel p-5" style={shadow.card}>
            <View className="flex-row items-center gap-2">
              <AppIcon name="report" size={20} color={colors.diagnosticRed} />
              <Text className="text-lg font-semibold text-text-primary">Reportar vendedor</Text>
            </View>
            <Text className="mt-1 text-xs leading-relaxed text-text-secondary">
              {product.sellerName ?? 'Este vendedor'}. Contanos qué pasó: intentos de pago fuera de la plataforma,
              estafa, producto defectuoso, etc.
            </Text>
            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="Motivo del reporte (mínimo 10 caracteres)"
              placeholderTextColor={colors.textMuted}
              multiline
              className="mt-3 min-h-[90px] rounded-xl border border-line bg-surface-low p-3 text-sm text-text-primary"
            />
            {reportError ? <Text className="mt-2 text-xs text-diagnostic-red">{reportError}</Text> : null}
            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => setReportOpen(false)}
                className="flex-1 items-center justify-center rounded-xl border border-line bg-elevated py-3"
              >
                <Text className="text-sm font-semibold text-text-secondary">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleReport}
                disabled={reportSending}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-red-500 py-3"
                style={reportSending ? { opacity: 0.7 } : undefined}
              >
                {reportSending ? (
                  <AppIcon name="sync" size={16} color="#ffffff" />
                ) : (
                  <AppIcon name="report" size={16} color="#ffffff" />
                )}
                <Text className="text-sm font-semibold text-white">Enviar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sticky purchase bar */}
      <View
        className="w-full flex-row items-center gap-3 bg-surface/95 px-4 py-3"
        style={{ borderTopWidth: 1, borderTopColor: colors.line, ...shadow.bottom }}
      >
        <View>
          <Text className="font-mono text-[11px] text-text-secondary">PRECIO FINAL</Text>
          <View className="flex-row items-baseline gap-1">
            <Text className="text-2xl font-bold text-text-primary">${product.price}</Text>
            <Text className="font-mono text-[11px] text-text-secondary">{product.currency}</Text>
          </View>
        </View>
        <Pressable
          onPress={handleBuy}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-secondary py-3.5"
          style={shadow.panel}
        >
          <AppIcon name="lock" size={20} color={colors.onSecondary} />
          <Text className="text-[15px] font-semibold text-on-secondary">Comprar con TechShield</Text>
        </Pressable>
      </View>

      {/* Seller reviews modal */}
      <Modal
        visible={reviewsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewsOpen(false)}
      >
        <View className="flex-1 items-center justify-end bg-black/70">
          <View className="h-[75%] w-full rounded-t-3xl border-t border-line bg-panel p-5" style={shadow.bottom}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <AppIcon name="star" size={20} color={colors.diagnosticAmber} />
                <Text className="text-lg font-semibold text-text-primary">Reseñas del vendedor</Text>
              </View>
              <Pressable onPress={() => setReviewsOpen(false)} className="h-9 w-9 items-center justify-center rounded-lg bg-panel">
                <AppIcon name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView className="mt-3 flex-1" showsVerticalScrollIndicator={false}>
              {reviewsLoading ? (
                <View className="items-center justify-center py-16">
                  <ActivityIndicator color={colors.secondary} size="large" />
                </View>
              ) : reviewsError ? (
                <View className="flex-row items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                  <AppIcon name="report" size={18} color={colors.diagnosticRed} />
                  <Text className="flex-1 text-xs leading-relaxed text-red-400">{reviewsError}</Text>
                </View>
              ) : sellerReviews.length === 0 ? (
                <View className="items-center justify-center gap-2 py-16">
                  <AppIcon name="star_border" size={30} color={colors.textMuted} />
                  <Text className="text-sm font-semibold text-text-primary">Sin reseñas aún</Text>
                  <Text className="text-center text-xs text-text-secondary">
                    Este vendedor todavía no tiene reseñas aprobadas.
                  </Text>
                </View>
              ) : (
                <View className="flex flex-col gap-3 pb-6">
                  {sellerReviews.map((review) => (
                    <View key={review.id} className="rounded-xl border border-line bg-panel p-3.5">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View className="h-7 w-7 items-center justify-center rounded-full bg-elevated">
                            <Text className="text-[11px] font-bold text-accent-cyan">
                              {(review.buyer?.name ?? 'C').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <Text className="text-sm font-semibold text-text-primary">
                            {review.buyer?.name ?? 'Comprador verificado'}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <AppIcon name="star" size={15} color={colors.diagnosticAmber} />
                          <Text className="font-mono text-xs font-bold text-text-primary">{review.rating}</Text>
                        </View>
                      </View>
                      <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
                        <View
                          className={`rounded border px-1.5 py-0.5 ${
                            review.type === 'positive'
                              ? 'border-emerald-500/40 bg-emerald-500/10'
                              : review.type === 'neutral'
                                ? 'border-cyan-500/40 bg-cyan-500/10'
                                : 'border-red-500/40 bg-red-500/10'
                          }`}
                        >
                          <Text
                            className="font-mono text-[10px] font-semibold uppercase tracking-wider"
                            style={{
                              color:
                                review.type === 'positive'
                                  ? colors.accentEmerald
                                  : review.type === 'neutral'
                                    ? colors.accentCyan
                                    : colors.diagnosticRed,
                            }}
                          >
                            {review.type}
                          </Text>
                        </View>
                        {review.isVerifiedPurchase ? (
                          <View className="flex-row items-center gap-1 rounded border border-sky-500/40 bg-sky-950/50 px-1.5 py-0.5">
                            <AppIcon name="verified" size={11} color="#7dd3fc" />
                            <Text className="font-mono text-[10px] font-semibold text-sky-300">COMPRA VERIFICADA</Text>
                          </View>
                        ) : null}
                      </View>
                      {review.comment ? (
                        <Text className="mt-2 text-xs leading-relaxed text-text-secondary">{review.comment}</Text>
                      ) : null}
                      {review.type === 'complaint' && review.complaintReason ? (
                        <View className="mt-2 rounded-lg border border-red-500/30 bg-red-500/5 p-2">
                          <Text className="text-xs leading-relaxed text-red-300/90">{review.complaintReason}</Text>
                        </View>
                      ) : null}
                      <Text className="mt-2 font-mono text-[10px] text-text-muted">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Checkout modal */}
      <Modal
        visible={checkoutOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckoutOpen(false)}
      >
        <View className="flex-1 items-center justify-end bg-black/70">
          <View className="w-full rounded-t-3xl border-t border-line bg-panel p-5" style={shadow.bottom}>
            {createdOrder ? (
              <View className="flex flex-col items-center gap-3 py-4">
                <View
                  className="h-16 w-16 items-center justify-center rounded-2xl border border-secondary/40 bg-secondary/10"
                  style={glow(colors.secondary, 18, 0.35)}
                >
                  <AppIcon name="check_circle" size={34} color={colors.accentEmerald} />
                </View>
                <Text className="text-xl font-bold text-text-primary">Orden creada con Custodia</Text>
                <Text className="text-center text-xs leading-relaxed text-text-secondary">
                  Tus {product.currency} ${Number(createdOrder.total).toFixed(2)} quedaron retenidos en la bóveda
                  TechShield. El vendedor no cobra hasta que recibas y verifiques el producto.
                </Text>
                <View className="mt-1 flex-row items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2">
                  <AppIcon name="verified" size={15} color={colors.accentCyan} />
                  <Text className="font-mono text-[11px] text-text-secondary">
                    ORDER ID: #{createdOrder.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setCheckoutOpen(false);
                    nav.go({ name: 'inspection', orderId: createdOrder.id });
                  }}
                  className="mt-2 w-full flex-row items-center justify-center gap-2 rounded-xl bg-secondary py-3.5"
                  style={shadow.panel}
                >
                  <AppIcon name="verified_user" size={20} color={colors.onSecondary} />
                  <Text className="text-base font-semibold text-on-secondary">
                    Ver seguimiento en custodia
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCheckoutOpen(false)}
                  className="w-full items-center justify-center rounded-xl border border-line bg-panel py-3"
                >
                  <Text className="text-sm font-semibold text-text-secondary">Seguir explorando</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View className="flex-row items-center gap-2">
                  <AppIcon name="account_balance_wallet" size={20} color={colors.accentCyan} />
                  <Text className="text-lg font-semibold text-text-primary">Checkout TechShield</Text>
                </View>

                <View className="mt-3 flex-row items-center gap-3 rounded-xl border border-line bg-panel p-3">
                  <View className="h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-low">
                    <AppIcon name="hardware" size={24} color={colors.accentCyan} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="truncate text-sm font-semibold text-text-primary">{product.title}</Text>
                    <Text className="font-mono text-xs text-text-secondary">Custodia escrow incluida</Text>
                  </View>
                  <Text className="text-lg font-bold text-text-primary">${product.price}</Text>
                </View>

                <Text className="mb-1.5 mt-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Dirección de envío *
                </Text>
                <TextInput
                  value={shippingAddress}
                  onChangeText={setShippingAddress}
                  placeholder="Ej: Av. Corrientes 1234, CABA"
                  placeholderTextColor={colors.textMuted}
                  className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-text-primary"
                />

                <Text className="mb-1.5 mt-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Método de pago
                </Text>
                <View className="flex-row gap-2">
                  {(['credit_card', 'bank_transfer', 'crypto'] as const).map((method) => {
                    const active = paymentMethod === method;
                    const labels: Record<string, string> = {
                      credit_card: 'Tarjeta',
                      bank_transfer: 'Transferencia',
                      crypto: 'Cripto',
                    };
                    return (
                      <Pressable
                        key={method}
                        onPress={() => setPaymentMethod(method)}
                        className="flex-1 items-center rounded-xl border px-2 py-2.5"
                        style={{
                          borderColor: active ? colors.secondary : colors.line,
                          backgroundColor: active ? colors.successSoft : colors.panel,
                          ...(active ? glow(colors.secondary, 8, 0.15) : undefined),
                        }}
                      >
                        <Text
                          className="font-mono text-[11px] font-semibold"
                          style={{ color: active ? colors.accentEmerald : colors.textSecondary }}
                        >
                          {labels[method]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {orderError ? (
                  <View className="mt-3 flex-row items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                    <AppIcon name="report" size={18} color={colors.diagnosticRed} />
                    <Text className="flex-1 text-xs leading-relaxed text-red-400">{orderError}</Text>
                  </View>
                ) : null}

                <View className="mt-4 flex-row gap-2">
                  <Pressable
                    onPress={() => setCheckoutOpen(false)}
                    className="flex-1 items-center justify-center rounded-xl border border-line bg-panel py-3"
                  >
                    <Text className="text-sm font-semibold text-text-secondary">Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={handlePlaceOrder}
                    disabled={placing}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-secondary py-3"
                    style={placing ? { opacity: 0.7 } : undefined}
                  >
                    {placing ? (
                      <AppIcon name="sync" size={18} color={colors.onSecondary} />
                    ) : (
                      <AppIcon name="lock" size={18} color={colors.onSecondary} />
                    )}
                    <Text className="text-sm font-semibold text-on-secondary">
                      {placing ? 'Creando escrow...' : 'Confirmar compra'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
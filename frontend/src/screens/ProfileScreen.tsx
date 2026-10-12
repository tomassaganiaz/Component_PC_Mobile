import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import ReviewModal from '../components/ReviewModal';
import { Avatar } from '../components/ui';
import { useThemeCtx } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import {
  deleteProduct,
  getMyOrders,
  getProductsBySeller,
  getProfile,
  verifyIdentity,
  verifyPhone,
} from '../services/api';
import type { OrderItem } from '../services/api';
import { colors, glow, shadow } from '../theme';
import type { ApiProduct, LoginSuccess, Nav, UserProfile } from '../types';

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
    <View className="flex-row items-center justify-between rounded-xl border border-line bg-panel px-3 py-3">
      <View className="flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-elevated">
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
  const { t, locale, setLocale } = useI18n();
  const [profile, setProfile] = useState<UserProfile>(session.user);
  const { theme, toggle } = useThemeCtx();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [reviewOrder, setReviewOrder] = useState<OrderItem | null>(null);
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState<'phone' | 'identity' | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [listings, setListings] = useState<ApiProduct[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiProduct | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getProfile(session.access_token);
      setProfile(data);
    } catch {
      // keep current
    }
  }, [session.access_token]);

  const handleVerify = async (kind: 'phone' | 'identity') => {
    setVerifying(kind);
    setVerifyError(null);
    try {
      if (kind === 'phone') {
        await verifyPhone();
      } else {
        await verifyIdentity();
      }
      await refreshProfile();
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'No se pudo completar la verificación.');
    } finally {
      setVerifying(null);
    }
  };

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMyOrders();
        if (!cancelled) setOrders(data);
      } catch {
        // sin órdenes
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getProductsBySeller(profile.id);
        if (!cancelled) setListings(data);
      } catch (err) {
        if (!cancelled) {
          setListingsError(err instanceof Error ? err.message : 'No se pudieron cargar tus publicaciones.');
        }
      } finally {
        if (!cancelled) setListingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setDeletingId(id);
    setListingsError(null);
    try {
      await deleteProduct(id);
      setListings((prev) => prev.filter((p) => p.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setListingsError(err instanceof Error ? err.message : 'No se pudo eliminar el producto.');
    } finally {
      setDeletingId(null);
    }
  };

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

  const listingStatus = (p: ApiProduct) => {
    if (p.status === 'sold') {
      return { label: t('profile.listingSold'), cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' };
    }
    if (p.status === 'published' || p.status === 'verified') {
      return (p.stock ?? 1) <= 0
        ? { label: t('profile.listingOutOfStock'), cls: 'border-red-500/40 bg-red-500/10 text-red-400' }
        : { label: t('profile.listingPublished'), cls: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' };
    }
    return { label: t('profile.listingDraft'), cls: 'border-line bg-inset text-text-secondary' };
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="Mi Perfil" activeTab />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Identity card */}
        <View className="px-4 pt-3">
          <View className="flex-row items-center gap-3.5 rounded-xl border border-line bg-card p-4" style={shadow.card}>
            <View className="relative">
              <Avatar uri={profile.avatar ?? undefined} size={60} initial={(profile.name[0] ?? 'T').toUpperCase()} ringColor={colors.primary + '66'} />
              <View
                className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full"
                style={{ backgroundColor: idVerified ? colors.secondary : colors.diagnosticAmber }}
              >
                <AppIcon name={idVerified ? 'verified' : 'badge'} size={12} color={colors.onSecondary} />
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
                <View className="flex-row items-center gap-1 rounded border border-line bg-panel px-1.5 py-0.5">
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
              backgroundColor: colors.inset,
              ...glow(tierTone, 12, 0.12),
            }}
          >
            <View className="h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: tierTone + '22' }}>
              <AppIcon name="verified_user" size={22} color={tierTone} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-text-primary">{t('profile.securityTitle')}</Text>
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
          <Text className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{t('profile.sectionKyc')}</Text>
          <View className="flex flex-col gap-2">
            <Row
              icon="phone_android"
              label={t('profile.phoneRow')}
              value={phoneVerified ? 'SÍ' : 'NO'}
              tone={phoneVerified ? colors.accentEmerald : colors.textMuted}
            />
            <Row
              icon="badge"
              label={t('profile.docRow')}
              value={idVerified ? 'SÍ' : 'NO'}
              tone={idVerified ? colors.accentEmerald : colors.textMuted}
            />
            <Row
              icon="science"
              label={t('profile.testingRow')}
              value={acceptsTesting ? 'SÍ' : 'NO'}
              tone={acceptsTesting ? colors.accentEmerald : colors.textMuted}
            />

            <View className="mt-1 flex-col gap-2">
              {!phoneVerified ? (
                <Pressable
                  onPress={() => handleVerify('phone')}
                  disabled={!!verifying}
                  className="flex-row items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-950/50 py-2.5"
                  style={verifying ? { opacity: 0.6 } : undefined}
                >
                  {verifying === 'phone' ? (
                    <AppIcon name="sync" size={16} color="#7dd3fc" />
                  ) : (
                    <AppIcon name="phone_android" size={16} color="#7dd3fc" />
                  )}
                  <Text className="text-xs font-semibold text-sky-300">{t('profile.verifyPhone')}</Text>
                </Pressable>
              ) : null}
              {!idVerified ? (
                <Pressable
                  onPress={() => handleVerify('identity')}
                  disabled={!!verifying}
                  className="flex-row items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-950/50 py-2.5"
                  style={verifying ? { opacity: 0.6 } : undefined}
                >
                  {verifying === 'identity' ? (
                    <AppIcon name="sync" size={16} color="#7dd3fc" />
                  ) : (
                    <AppIcon name="badge" size={16} color="#7dd3fc" />
                  )}
                  <Text className="text-xs font-semibold text-sky-300">{t('profile.verifyDoc')}</Text>
                </Pressable>
              ) : null}
              {verifyError ? <Text className="text-xs text-diagnostic-red">{verifyError}</Text> : null}
            </View>
          </View>
        </View>

        {/* Orders */}
        <View className="px-4 pt-4">
          <Text className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Mis compras ({orders.length})
          </Text>
          {orders.length === 0 ? (
            <View className="flex-row items-center gap-2.5 rounded-xl border border-line bg-panel p-3">
              <AppIcon name="receipt_long" size={18} color={colors.textMuted} />
              <Text className="flex-1 text-xs leading-relaxed text-text-secondary">
                Aún no tenés compras. Tus órdenes con custodia van a aparecer acá.
              </Text>
            </View>
          ) : (
            <View className="flex flex-col gap-2">
              {orders.map((order) => {
                const reviewable = order.status === 'delivered' || order.status === 'refunded';
                const alreadyReviewed = reviewedOrderIds.has(order.id);
                return (
                  <View key={order.id} className="rounded-xl border border-line bg-panel p-3">
                    <Pressable
                      onPress={() => nav.go({ name: 'inspection', orderId: order.id })}
                      className="flex-row items-center gap-3"
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-lg bg-elevated">
                        <AppIcon name="receipt_long" size={18} color={colors.accentCyan} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="truncate text-sm font-semibold text-text-primary">
                          {order.product?.title ?? `Orden #${order.id.slice(0, 8).toUpperCase()}`}
                        </Text>
                        <Text className="font-mono text-[11px] text-text-secondary">
                          ${Number(order.total).toFixed(2)} · #{order.id.slice(0, 8).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1 rounded border border-line bg-inset px-2 py-0.5">
                        <Text className="font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
                          {order.status.replace(/_/g, ' ')}
                        </Text>
                      </View>
                      <AppIcon name="arrow_forward" size={18} color={colors.textMuted} />
                    </Pressable>
                    {reviewable ? (
                      <Pressable
                        onPress={() => {
                          if (!alreadyReviewed) setReviewOrder(order);
                        }}
                        className={`mt-2.5 flex-row items-center justify-center gap-1.5 rounded-lg border py-2 ${
                          alreadyReviewed
                            ? 'border-line bg-inset opacity-60'
                            : 'border-amber-500/40 bg-amber-500/10'
                        }`}
                      >
                        <AppIcon
                          name="star"
                          size={15}
                          color={alreadyReviewed ? colors.textMuted : colors.diagnosticAmber}
                        />
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: alreadyReviewed ? colors.textMuted : colors.diagnosticAmber }}
                        >
                          {alreadyReviewed ? 'Reseña enviada' : 'Reseñar esta compra'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* My listings */}
        <View className="px-4 pt-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              {t('profile.myListings')} ({listings.length})
            </Text>
            <Pressable onPress={() => nav.go({ name: 'publish' })} className="flex-row items-center gap-1">
              <AppIcon name="add" size={14} color={colors.primary} />
              <Text className="font-mono text-[11px] font-medium text-primary">{t('profile.newListing')}</Text>
            </Pressable>
          </View>

          {listingsError ? (
            <View className="mb-2 flex-row items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
              <AppIcon name="report" size={18} color={colors.diagnosticRed} />
              <Text className="flex-1 text-xs leading-relaxed text-red-400">{listingsError}</Text>
            </View>
          ) : null}

          {listingsLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator color={colors.accentCyan} />
            </View>
          ) : listings.length === 0 ? (
            <View className="flex-row items-center gap-2.5 rounded-xl border border-line bg-panel p-3">
              <AppIcon name="inventory_2" size={18} color={colors.textMuted} />
              <Text className="flex-1 text-xs leading-relaxed text-text-secondary">
                {t('profile.noListings')}
              </Text>
            </View>
          ) : (
            <View className="flex flex-col gap-2">
              {listings.map((item) => {
                const meta = listingStatus(item);
                const isSold = item.status === 'sold';
                const deleting = deletingId === item.id;
                return (
                  <View key={item.id} className="rounded-xl border border-line bg-panel p-3">
                    <View className="flex-row items-center gap-3">
                      <View className="h-9 w-9 items-center justify-center rounded-lg bg-elevated">
                        <AppIcon name="inventory_2" size={18} color={colors.primary} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="truncate text-sm font-semibold text-text-primary">{item.title}</Text>
                        <Text className="font-mono text-[11px] text-text-secondary">
                          ${Number(item.price).toFixed(2)} · #{item.id.slice(0, 6).toUpperCase()}
                        </Text>
                      </View>
                      <View className={`flex-row items-center gap-1 rounded border px-2 py-0.5 ${meta.cls}`}>
                        <Text className="font-mono text-[10px] font-semibold uppercase tracking-wider">
                          {meta.label}
                        </Text>
                      </View>
                    </View>
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="font-mono text-[11px] text-text-muted">
                        {t('profile.stockLabel')}: {item.stock ?? 0}
                      </Text>
                      {isSold ? (
                        <Pressable
                          onPress={() => setConfirmDelete(item)}
                          disabled={deleting}
                          className="flex-row items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5"
                          style={deleting ? { opacity: 0.6 } : undefined}
                        >
                          {deleting ? (
                            <ActivityIndicator size="small" color={colors.diagnosticRed} />
                          ) : (
                            <AppIcon name="delete" size={15} color={colors.diagnosticRed} />
                          )}
                          <Text className="text-xs font-semibold text-red-400">{t('profile.deleteListing')}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Review modal */}
        <ReviewModal
          visible={!!reviewOrder}
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSubmitted={(orderId) => {
            setReviewedOrderIds((prev) => new Set(prev).add(orderId));
          }}
        />

        {/* Delete confirmation */}
        <Modal
          visible={!!confirmDelete}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmDelete(null)}
        >
          <View className="flex-1 items-center justify-center bg-black/70 px-6">
            <View className="w-full rounded-2xl border border-line bg-panel p-5" style={shadow.card}>
              <View className="flex-row items-center gap-2">
                <AppIcon name="delete" size={20} color={colors.diagnosticRed} />
                <Text className="text-lg font-semibold text-text-primary">{t('profile.deleteListing')}</Text>
              </View>
              <Text className="mt-1 text-xs leading-relaxed text-text-secondary">
                {t('profile.deleteConfirm')}
              </Text>
              {confirmDelete ? (
                <Text className="mt-2 text-sm font-semibold text-text-primary">{confirmDelete.title}</Text>
              ) : null}
              <View className="mt-4 flex-row gap-2">
                <Pressable
                  onPress={() => setConfirmDelete(null)}
                  className="flex-1 items-center justify-center rounded-xl border border-line bg-elevated py-3"
                >
                  <Text className="text-sm font-semibold text-text-secondary">{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  disabled={!!deletingId}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-red-500 py-3"
                  style={deletingId ? { opacity: 0.7 } : undefined}
                >
                  {deletingId ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <AppIcon name="delete" size={16} color="#ffffff" />
                  )}
                  <Text className="text-sm font-semibold text-white">{t('profile.deleteListing')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Quick actions */}
        <View className="px-4 pt-4">
          <Text className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Cuenta
          </Text>
          <View className="flex flex-col gap-2">
            <Pressable
              onPress={() => nav.go({ name: 'publish' })}
              className="flex-row items-center gap-3 rounded-xl border border-line bg-panel p-3"
            >
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-elevated">
                <AppIcon name="add" size={17} color={colors.primary} />
              </View>
              <Text className="flex-1 text-sm text-text-primary">{t('profile.publishProduct')}</Text>
              <AppIcon name="arrow_forward" size={18} color={colors.textMuted} />
            </Pressable>
            {profile.role === 'seller' || profile.role === 'admin' ? (
              <>
                <Pressable
                  onPress={() => nav.go({ name: 'sales' })}
                  className="flex-row items-center gap-3 rounded-xl border border-line bg-panel p-3"
                >
                  <View className="h-8 w-8 items-center justify-center rounded-lg bg-elevated">
                    <AppIcon name="sell" size={17} color={colors.accentCyan} />
                  </View>
                  <Text className="flex-1 text-sm text-text-primary">{t('profile.mySales')}</Text>
                  <AppIcon name="arrow_forward" size={18} color={colors.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => nav.go({ name: 'wallet' })}
                  className="flex-row items-center gap-3 rounded-xl border border-line bg-panel p-3"
                >
                  <View className="h-8 w-8 items-center justify-center rounded-lg bg-elevated">
                    <AppIcon name="account_balance_wallet" size={17} color={colors.accentEmerald} />
                  </View>
                  <Text className="flex-1 text-sm text-text-primary">{t('profile.income')}</Text>
                  <AppIcon name="arrow_forward" size={18} color={colors.textMuted} />
                </Pressable>
              </>
            ) : null}
            {profile.role === 'admin' ? (
              <Pressable
                onPress={() => nav.go({ name: 'admin' })}
                className="flex-row items-center gap-3 rounded-xl border border-line bg-panel p-3"
              >
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-elevated">
                  <AppIcon name="admin_panel_settings" size={17} color={colors.primary} />
                </View>
                <Text className="flex-1 text-sm text-text-primary">{t('profile.adminPanel')}</Text>
                <AppIcon name="arrow_forward" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => nav.go({ name: 'inspection' })}
              className="flex-row items-center gap-3 rounded-xl border border-line bg-panel p-3"
            >
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-elevated">
                <AppIcon name="verified_user" size={17} color={colors.accentCyan} />
              </View>
              <Text className="flex-1 text-sm text-text-primary">{t('profile.auditTracking')}</Text>
              <AppIcon name="arrow_forward" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => nav.go({ name: 'filters' })}
              className="flex-row items-center gap-3 rounded-xl border border-line bg-panel p-3"
            >
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-elevated">
                <AppIcon name="manage_search" size={17} color={colors.accentEmerald} />
              </View>
              <Text className="flex-1 text-sm text-text-primary">{t('profile.securityFilters')}</Text>
              <AppIcon name="arrow_forward" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable
onPress={() => nav.go({ name: 'analytics' })}
              className="flex-row items-center gap-3 rounded-xl border border-line bg-panel p-3"
            >
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-elevated">
                <AppIcon name="equalizer" size={17} color={colors.primary} />
              </View>
              <Text className="flex-1 text-sm text-text-primary">{t('profile.analytics')}</Text>
              <AppIcon name="arrow_forward" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={toggle}
              className="flex-row items-center gap-3 rounded-xl border border-line bg-panel p-3"
            >
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-elevated">
                <AppIcon name={theme === 'dark' ? 'light_mode' : 'nightlight'} size={17} color={colors.primary} />
              </View>
              <Text className="flex-1 text-sm text-text-primary">
                {theme === 'dark' ? t('profile.lightMode') : t('profile.darkMode')}
              </Text>
              <AppIcon name="arrow_forward" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => setLocale(locale === 'es' ? 'en' : 'es')}
              className="flex-row items-center gap-3 rounded-xl border border-line bg-panel p-3"
              accessibilityRole="button"
              accessibilityLabel={t('profile.language')}
            >
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-elevated">
                <AppIcon name="languages" size={17} color={colors.primary} />
              </View>
              <Text className="flex-1 text-sm text-text-primary">{t('profile.language')}</Text>
              <Text className="font-mono text-xs font-semibold text-text-secondary">
                {locale.toUpperCase()}
              </Text>
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
            <Text className="text-sm font-semibold text-red-400">{t('profile.logout')}</Text>
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
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import ProductCard from '../components/ProductCard';
import { PulseDot, Segmented } from '../components/ui';
import { CATEGORIES, PRODUCTS } from '../data/mock';
import { getProducts } from '../services/api';
import { colors, glow, shadow } from '../theme';
import type { ExploreCard, Nav, ProductFilters } from '../types';
import { toExploreCard } from '../utils/product';

function filterMock(filters: ProductFilters): ExploreCard[] {
  return PRODUCTS.filter((p) => {
    if (filters.sellerTier && p.sellerTier !== filters.sellerTier) return false;
    if (filters.verified === true && p.verified !== true) return false;
    if (filters.condition === 'new' && p.condition !== 'new') return false;
    if (filters.warranty === 'extended' && !p.warranty?.extended) return false;
    if (filters.warranty === 'techshield' && (p.warranty?.days ?? 0) < 90) return false;
    if (filters.minPositivity !== undefined && (p.sellerStats?.positivity ?? 0) < filters.minPositivity) return false;
    if (filters.maxHoursOfUse !== undefined && p.hoursOfUse != null && p.hoursOfUse > filters.maxHoursOfUse) return false;
    if (filters.noMining === true && (p.usageType ?? '').toLowerCase().includes('miner')) return false;
    if (filters.hideWithComplaints === true && (p.openComplaints ?? 0) > 0) return false;
    if (filters.hideSuspicious === true && p.priceFlag === 'suspicious') return false;
    if (filters.escrow === true && p.escrowProtected === false) return false;
    if (filters.search && !`${p.title} ${p.subtitle}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}

export default function ExploreScreen({ nav, filters }: { nav: Nav; filters: ProductFilters }) {
  const [condition, setCondition] = useState(0);
  const [search, setSearch] = useState('');
  const [cards, setCards] = useState<ExploreCard[]>(PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getProducts({ ...filters, search: search || undefined });
        if (cancelled) return;
        setCards(data.map(toExploreCard));
        setOffline(false);
      } catch {
        if (cancelled) return;
        setCards(filterMock(filters));
        setOffline(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters, search]);

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="Explore Marketplace" activeTab />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View className="px-4 pb-1 pt-2">
          <View className="relative w-full flex-row items-center">
            <View className="pointer-events-none absolute left-3.5 z-10">
              <AppIcon name="search" size={20} color={colors.textMuted} />
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Ryzen 7 7800X3D, RTX 3080, Galaxy S23..."
              placeholderTextColor={colors.textMuted}
              className="h-11 w-full rounded-xl border border-[#23324d] bg-[#131c2e] pl-10 pr-24 text-xs text-on-surface"
            />
            <View
              className="absolute right-2 flex-row items-center gap-1 rounded-lg border border-[#2d4063] bg-[#1c2942] px-2 py-0.5"
            >
              <AppIcon name="verified" size={14} color={colors.accentCyan} />
              <Text className="font-mono text-[10px] font-semibold tracking-tight text-primary">CUSTODIA</Text>
            </View>
          </View>
        </View>

        {/* Active filters strip */}
        {(filters.sellerTier ||
            filters.verified ||
            filters.condition === 'new' ||
            filters.warranty ||
            filters.minPositivity ||
            filters.maxHoursOfUse ||
            filters.noMining ||
            filters.hideWithComplaints ||
            filters.hideSuspicious ||
            filters.escrow) && !offline ? (
          <View className="flex-row flex-wrap items-center gap-2 px-4 pt-2">
            {filters.sellerTier ? (
              <View className="flex-row items-center gap-1 rounded-full border border-primary/40 bg-[#182845] px-2.5 py-0.5">
                <AppIcon name="verified_user" size={13} color={colors.primary} />
                <Text className="font-mono text-[10px] font-semibold text-primary">
                  {filters.sellerTier === 'secure' ? 'SEGURO' : filters.sellerTier === 'normal' ? 'NORMAL' : 'NO SEGURO'}
                </Text>
              </View>
            ) : null}
            {filters.condition === 'new' ? (
              <View className="flex-row items-center gap-1 rounded-full border border-sky-400/60 bg-[#0a1b2e] px-2.5 py-0.5">
                <AppIcon name="inventory_2" size={13} color="#7dd3fc" />
                <Text className="font-mono text-[10px] font-semibold text-sky-300">NUEVOS · SIN ABRIR</Text>
              </View>
            ) : null}
            {filters.warranty === 'extended' ? (
              <View className="flex-row items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-0.5">
                <Text className="font-mono text-[10px] font-semibold text-cyan-300">COBERTURA EXTENDIDA</Text>
              </View>
            ) : null}
            {filters.warranty === 'techshield' ? (
              <View className="flex-row items-center gap-1 rounded-full border border-secondary/40 bg-secondary/10 px-2.5 py-0.5">
                <Text className="font-mono text-[10px] font-semibold text-secondary">GARANTÍA 90 DÍAS</Text>
              </View>
            ) : null}
            {filters.minPositivity ? (
              <View className="flex-row items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5">
                <Text className="font-mono text-[10px] font-semibold text-emerald-300">{filters.minPositivity}%+ POSITIVIDAD</Text>
              </View>
            ) : null}
            {filters.maxHoursOfUse ? (
              <View className="flex-row items-center gap-1 rounded-full border border-[#233554] bg-[#111a2e] px-2.5 py-0.5">
                <Text className="font-mono text-[10px] font-semibold text-text-secondary">{"<"} {filters.maxHoursOfUse} H DE USO</Text>
              </View>
            ) : null}
            {filters.noMining ? (
              <View className="flex-row items-center gap-1 rounded-full border border-[#233554] bg-[#111a2e] px-2.5 py-0.5">
                <Text className="font-mono text-[10px] font-semibold text-text-secondary">SIN MINERÍA</Text>
              </View>
            ) : null}
            {filters.hideWithComplaints ? (
              <View className="flex-row items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5">
                <Text className="font-mono text-[10px] font-semibold text-red-400">SIN QUEJAS ABIERTAS</Text>
              </View>
            ) : null}
            {filters.hideSuspicious ? (
              <View className="flex-row items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5">
                <Text className="font-mono text-[10px] font-semibold text-amber-300">SIN PRECIO SOSPECHOSO</Text>
              </View>
            ) : null}
            {filters.escrow ? (
              <View className="flex-row items-center gap-1 rounded-full border border-secondary/40 bg-secondary/10 px-2.5 py-0.5">
                <Text className="font-mono text-[10px] font-semibold text-secondary">CUSTODIA</Text>
              </View>
            ) : null}
            {filters.verified ? (
              <View className="flex-row items-center gap-1 rounded-full border border-secondary/40 bg-secondary/10 px-2.5 py-0.5">
                <AppIcon name="verified" size={13} color={colors.secondary} />
                <Text className="font-mono text-[10px] font-semibold text-secondary">CHECQUEADO PARA COMPRA</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Offline notice */}
        {offline ? (
          <View className="mx-4 mt-2 flex-row items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <AppIcon name="notifications_active" size={18} color={colors.diagnosticAmber} />
            <Text className="flex-1 text-xs leading-relaxed text-amber-300">
              Backend no disponible. Mostrando productos de demostración (sin filtros en vivo).
            </Text>
          </View>
        ) : null}

        {/* Trust hero */}
        <View className="px-4 py-2">
          <LinearGradient
            colors={['#101e3d', '#0e1933', '#0c152b']}
            className="overflow-hidden rounded-xl border border-[#23385d] p-4"
            style={shadow.card}
          >
            <View className="pointer-events-none absolute -bottom-6 -right-6 h-36 w-36 rounded-full bg-secondary/15" />
            <View className="pointer-events-none absolute -left-6 -top-6 h-28 w-28 rounded-full bg-primary/10" />
            <View className="relative z-10 flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <View
                  className="self-start flex-row items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/15 px-2.5 py-0.5"
                  style={glow(colors.secondary, 8, 0.15)}
                >
                  <AppIcon name="shield_with_heart" size={14} color={colors.secondary} />
                  <Text className="font-mono text-[10px] font-semibold uppercase tracking-wider text-secondary">
                    100% Protegido con Custodia
                  </Text>
                </View>
                <Text className="mt-0.5 text-xl font-semibold leading-tight text-text-primary">
                  Garantía Técnica Blindada
                </Text>
                <Text className="text-xs leading-relaxed text-text-secondary">
                  El pago permanece en custodia hasta que nuestro laboratorio audita pines, curvas térmicas y estrés de
                  silicio.
                </Text>
              </View>
              <View
                className="h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#294373] bg-[#172748]"
                style={glow(colors.accentCyan, 15, 0.25)}
              >
                <AppIcon name="hardware" size={28} color={colors.accentCyan} />
              </View>
            </View>
            <View className="mt-3 flex-row gap-2 rounded-lg border border-[#1e2f4f]/80 bg-[#081020]/75 p-2.5">
              <View className="flex-1 flex-row items-center gap-1.5">
                <AppIcon name="check_circle" size={16} color={colors.secondary} />
                <Text className="font-mono text-[10.5px] font-medium text-on-surface">Pines & Socket</Text>
              </View>
              <View className="flex-1 flex-row items-center gap-1.5">
                <AppIcon name="thermostat" size={16} color={colors.tertiary} />
                <Text className="font-mono text-[10.5px] font-medium text-on-surface">Test Térmico</Text>
              </View>
              <View className="flex-1 flex-row items-center gap-1.5">
                <AppIcon name="battery_charging_full" size={16} color={colors.accentEmerald} />
                <Text className="font-mono text-[10.5px] font-medium text-on-surface">Salud & Ciclos</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Categories */}
        <View className="py-1">
          <View className="mb-2 flex-row items-center justify-between px-4">
            <Text className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Categorías de Silicio
            </Text>
            <Text className="font-mono text-[11px] font-medium text-primary">Ver todas</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {CATEGORIES.map((cat) =>
              cat.active ? (
                <Pressable
                  key={cat.label}
                  className="flex-row items-center gap-1.5 rounded-xl border border-primary/40 bg-[#162744] px-3 py-2"
                  style={glow(colors.primary, 12, 0.15)}
                >
                  <AppIcon name={cat.icon} size={18} color={colors.accentCyan} />
                  <Text className="text-xs font-semibold text-text-primary">{cat.label}</Text>
                </Pressable>
              ) : (
                <Pressable
                  key={cat.label}
                  className="flex-row items-center gap-1.5 rounded-xl border border-[#20304a] bg-[#111b2e] px-3 py-2"
                >
                  <AppIcon name={cat.icon} size={18} color={colors.outline} />
                  <Text className="text-xs font-medium text-text-secondary">{cat.label}</Text>
                </Pressable>
              ),
            )}
          </ScrollView>
        </View>

        {/* Condition filter */}
        <View className="px-4 py-2">
          <Segmented
            options={['Todos', 'Nuevos Sellados', 'Grado A+ Certificado']}
            value={condition}
            onChange={setCondition}
          />
        </View>

        {/* Feed header */}
        <View className="flex-row items-center justify-between px-4 pb-1 pt-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl text-text-primary">Auditoría Reciente</Text>
            <View className="flex-row items-center gap-1 rounded-full border border-secondary/40 bg-secondary/15 px-2 py-0.5">
              <PulseDot size={6} />
              <Text className="font-mono text-[10px] font-bold uppercase tracking-wider text-secondary">En Vivo</Text>
            </View>
          </View>
          <Text className="font-mono text-[11px] text-text-muted">{cards.length} ítems listos</Text>
        </View>

        {/* Product cards */}
        <View className="flex flex-col gap-4 px-4 pb-4 pt-2">
          {loading ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator color={colors.secondary} size="large" />
              <Text className="mt-3 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
                Consultando auditoría...
              </Text>
            </View>
          ) : cards.length === 0 ? (
            <View className="items-center justify-center gap-3 rounded-xl border border-[#233554] bg-[#111a2e] px-6 py-14">
              <AppIcon name="search" size={32} color={colors.textMuted} />
              <Text className="text-base font-semibold text-text-primary">Sin resultados</Text>
              <Text className="text-center text-xs text-text-secondary">
                No hay productos que cumplan estos filtros de seguridad y chequeo.
              </Text>
            </View>
          ) : (
            cards.map((product) => (
              <ProductCard
                key={product.id}
                card={product}
                onPress={() => nav.go({ name: 'detail', productId: product.id, product })}
                onBuy={() => nav.go({ name: 'detail', productId: product.id, product })}
              />
            ))
          )}
        </View>

        {/* Seller callout */}
        <View className="px-4 pb-6">
          <LinearGradient
            colors={['#121e35', '#0c1527']}
            className="flex flex-col gap-3 overflow-hidden rounded-xl border border-[#233554] p-4"
            style={shadow.card}
          >
            <View className="flex-row items-center gap-3">
              <View
                className="h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-[#1b2b4d]"
                style={glow(colors.primary, 15, 0.2)}
              >
                <AppIcon name="verified" size={24} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-text-primary">¿Vendes hardware o móviles?</Text>
                <Text className="text-xs text-text-secondary">
                  Certificamos tus componentes gratis y vendes hasta 3x más rápido.
                </Text>
              </View>
            </View>
            <Pressable
              className="flex-row items-center justify-center gap-2 rounded-xl border border-primary/40 bg-[#1e3a73] py-2.5"
              style={glow('#1e3a73', 15, 0.5)}
            >
              <Text className="text-xs font-semibold text-text-primary">Solicitar Kit de Auditoría Gratuito</Text>
              <AppIcon name="arrow_forward" size={18} color={colors.primary} />
            </Pressable>
          </LinearGradient>
        </View>
      </ScrollView>

      <BottomNav active="explore" onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}
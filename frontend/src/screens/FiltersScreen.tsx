import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import { colors, glow, shadow } from '../theme';
import type { Nav, ProductFilters, SellerTier } from '../types';

type TierOption = 'all' | SellerTier;
type WarrantyOption = 'all' | 'techshield' | 'extended';

const POSITIVITY_OPTIONS = [0, 75, 85, 90];

const TIER_OPTIONS: {
  value: TierOption;
  label: string;
  desc: string;
  tone: 'emerald' | 'cyan' | 'red';
}[] = [
  {
    value: 'secure',
    label: 'Seguro',
    desc: '75% o más de positividad · sin quejas ni devoluciones por fallas · acepta todas las revisiones y testeos antes de vender.',
    tone: 'emerald',
  },
  {
    value: 'normal',
    label: 'Normal',
    desc: '50% o más de positividad · pocas quejas o devoluciones por fallas · acepta algunas revisiones y testeos.',
    tone: 'cyan',
  },
  {
    value: 'not_secure',
    label: 'No Seguro',
    desc: 'Menos de 50% de positividad · quejas y devoluciones por fallas · acepta pocas o ninguna revisión y testeo.',
    tone: 'red',
  },
];

const toneMap = {
  emerald: { border: '#34d399', bg: '#06271a', text: '#6ee7b7' },
  cyan: { border: '#22d3ee', bg: '#06222e', text: '#67e8f9' },
  red: { border: '#f87171', bg: '#2a1010', text: '#fca5a5' },
} as const;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
      {children}
    </Text>
  );
}

function Chip({
  active,
  label,
  onPress,
  color,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl border px-3 py-2"
      style={{
        borderColor: active ? color : '#233554',
        backgroundColor: active ? '#131c2e' : '#111a2e',
        ...(active ? glow(color, 8, 0.2) : undefined),
      }}
    >
      <Text className="font-mono text-[11px] font-semibold" style={{ color: active ? color : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
  activeColor = colors.secondary,
  icon,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  activeColor?: string;
  icon: string;
}) {
  return (
    <View
      className="flex-row items-center justify-between gap-3 rounded-xl border border-[#233554] bg-[#111a2e] p-3"
      style={value ? { borderColor: activeColor + '66', ...glow(activeColor, 10, 0.15) } : undefined}
    >
      <View className="flex-1 flex-row items-start gap-2.5">
        <AppIcon name={icon} size={18} color={value ? activeColor : colors.textMuted} style={{ marginTop: 1 }} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-text-primary">{label}</Text>
          <Text className="mt-0.5 text-xs leading-relaxed text-text-secondary">{desc}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#334155', true: activeColor }}
        thumbColor="#0b1326"
      />
    </View>
  );
}

export default function FiltersScreen({
  nav,
  filters,
  onApply,
}: {
  nav: Nav;
  filters: ProductFilters;
  onApply: (filters: ProductFilters) => void;
}) {
  const [tier, setTier] = useState<TierOption>(filters.sellerTier ?? 'all');
  const [verifiedOnly, setVerifiedOnly] = useState(filters.verified === true);
  const [newOnly, setNewOnly] = useState(filters.condition === 'new');
  const [warranty, setWarranty] = useState<WarrantyOption>(filters.warranty ?? 'all');
  const [positivity, setPositivity] = useState<number>(filters.minPositivity ?? 0);
  const [maxHours, setMaxHours] = useState(filters.maxHoursOfUse === 500);
  const [noMining, setNoMining] = useState(filters.noMining === true);
  const [hideComplaints, setHideComplaints] = useState(filters.hideWithComplaints === true);
  const [escrow, setEscrow] = useState(filters.escrow === true);
  const [hideSuspicious, setHideSuspicious] = useState(filters.hideSuspicious === true);

  const apply = () => {
    onApply({
      sellerTier: tier === 'all' ? undefined : tier,
      verified: verifiedOnly ? true : undefined,
      condition: newOnly ? 'new' : undefined,
      sealed: newOnly ? true : undefined,
      warranty: warranty === 'all' ? undefined : warranty,
      minPositivity: positivity > 0 ? positivity : undefined,
      maxHoursOfUse: maxHours ? 500 : undefined,
      noMining: noMining ? true : undefined,
      hideWithComplaints: hideComplaints ? true : undefined,
      escrow: escrow ? true : undefined,
      hideSuspicious: hideSuspicious ? true : undefined,
    });
    nav.go({ name: 'explore' });
  };

  const reset = () => {
    setTier('all');
    setVerifiedOnly(false);
    setNewOnly(false);
    setWarranty('all');
    setPositivity(0);
    setMaxHours(false);
    setNoMining(false);
    setHideComplaints(false);
    setEscrow(false);
    setHideSuspicious(false);
    onApply({});
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="Filtros Técnicos" activeTab />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-2 pt-3">
          <Text className="text-2xl font-bold text-text-primary">Filtros de Seguridad</Text>
          <Text className="mt-1 text-xs text-text-secondary">
            Clasificamos a los vendedores según su positividad, quejas y aceptación de revisiones.
          </Text>
        </View>

        {/* Tier selector */}
        <View className="px-4 pt-3">
          <SectionTitle>1. Seguridad del Vendedor</SectionTitle>
          <View className="mt-2 flex flex-col gap-2">
            <Pressable
              onPress={() => setTier('all')}
              className="flex-row items-center gap-2 rounded-xl border border-[#233554] bg-[#111a2e] p-3"
              style={tier === 'all' ? { borderColor: colors.primary, ...glow(colors.primary, 10, 0.2) } : undefined}
            >
              <View
                className="h-4 w-4 items-center justify-center rounded-full border"
                style={{ borderColor: tier === 'all' ? colors.primary : '#64748b' }}
              >
                {tier === 'all' ? <View className="h-2 w-2 rounded-full bg-primary" /> : null}
              </View>
              <Text className="text-sm font-semibold text-text-primary">Todos los vendedores</Text>
            </Pressable>

            {TIER_OPTIONS.map((opt) => {
              const tone = toneMap[opt.tone];
              const active = tier === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setTier(opt.value)}
                  className="flex-row items-start gap-3 rounded-xl border p-3"
                  style={{
                    borderColor: active ? tone.border : '#233554',
                    backgroundColor: active ? tone.bg : '#111a2e',
                    ...(active ? glow(tone.border, 10, 0.25) : undefined),
                  }}
                >
                  <View
                    className="mt-0.5 h-4 w-4 items-center justify-center rounded-full border"
                    style={{ borderColor: active ? tone.border : '#64748b' }}
                  >
                    {active ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: tone.text }} /> : null}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-base font-bold" style={{ color: active ? tone.text : colors.textPrimary }}>
                        Vendedor {opt.label}
                      </Text>
                      {active ? <AppIcon name="verified" size={14} color={tone.text} /> : null}
                    </View>
                    <Text className="mt-0.5 text-xs leading-relaxed text-text-secondary">{opt.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Verified toggle */}
        <View className="px-4 pt-4">
          <SectionTitle>2. Chequeo del Producto</SectionTitle>
          <View className="mt-2">
            <ToggleRow
              icon="verified"
              label="Chequeado para Compra"
              desc="Solo productos con check verde del laboratorio: horas de uso, tipo de uso y estrés reales, comparables con lo declarado."
              value={verifiedOnly}
              onChange={setVerifiedOnly}
            />
          </View>
        </View>

        {/* New products */}
        <View className="px-4 pt-4">
          <SectionTitle>3. Estado del Producto</SectionTitle>
          <View className="mt-2">
            <ToggleRow
              icon="inventory_2"
              label="Productos Nuevos"
              desc="Sin uso y sin sacar de la caja, con su etiqueta especial azul 'Nuevo'."
              value={newOnly}
              onChange={setNewOnly}
              activeColor="#38bdf8"
            />
          </View>
        </View>

        {/* Warranty */}
        <View className="px-4 pt-4">
          <SectionTitle>4. Garantía / Cobertura</SectionTitle>
          <View className="mt-2 flex-row flex-wrap gap-2">
            <Chip active={warranty === 'all'} label="Todas" onPress={() => setWarranty('all')} color={colors.primary} />
            <Chip active={warranty === 'techshield'} label="Garantía TechShield 90 días" onPress={() => setWarranty('techshield')} color={colors.accentEmerald} />
            <Chip active={warranty === 'extended'} label="Cobertura extendida" onPress={() => setWarranty('extended')} color={colors.accentCyan} />
          </View>
        </View>

        {/* Min positivity */}
        <View className="px-4 pt-4">
          <SectionTitle>5. Positividad mínima del vendedor</SectionTitle>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {POSITIVITY_OPTIONS.map((p) => (
              <Chip
                key={p}
                active={positivity === p}
                label={p === 0 ? 'Todas' : `${p}%+`}
                onPress={() => setPositivity(p)}
                color={p >= 85 ? colors.accentEmerald : p >= 75 ? colors.secondary : colors.primary}
              />
            ))}
          </View>
        </View>

        {/* Usage */}
        <View className="px-4 pt-4">
          <SectionTitle>6. Uso del producto</SectionTitle>
          <View className="mt-2 flex flex-col gap-2">
            <ToggleRow
              icon="hourglass_empty"
              label="Menos de 500 h de uso"
              desc="Solo productos usados con menos de 500 horas verificadas."
              value={maxHours}
              onChange={setMaxHours}
            />
            <ToggleRow
              icon="speed"
              label="Sin estrés de minería"
              desc="Excluye componentes que fueron usados en minería de criptomonedas."
              value={noMining}
              onChange={setNoMining}
            />
          </View>
        </View>

        {/* Extra security */}
        <View className="px-4 pt-4">
          <SectionTitle>7. Seguridad extra</SectionTitle>
          <View className="mt-2 flex flex-col gap-2">
            <ToggleRow
              icon="verified_user"
              label="Solo con custodia / escrow"
              desc="Compras con el dinero protegido en custodia hasta la verificación."
              value={escrow}
              onChange={setEscrow}
            />
            <ToggleRow
              icon="report"
              label="Ocultar productos con quejas abiertas"
              desc="Excluye productos con quejas activas o sin resolver."
              value={hideComplaints}
              onChange={setHideComplaints}
            />
            <ToggleRow
              icon="notifications_active"
              label="Ocultar precios sospechosos"
              desc="Anti-estafa: excluye productos >20% por debajo del promedio de mercado del mismo modelo."
              value={hideSuspicious}
              onChange={setHideSuspicious}
              activeColor={colors.diagnosticAmber}
            />
          </View>
        </View>

        {/* Actions */}
        <View className="flex flex-col gap-2.5 px-4 pb-6 pt-5">
          <Pressable
            onPress={apply}
            className="flex-row items-center justify-center gap-2 rounded-xl bg-secondary py-3.5"
            style={shadow.panel}
          >
            <AppIcon name="verified_user" size={20} color={colors.onSecondary} />
            <Text className="text-base font-semibold text-on-secondary">Aplicar Filtros</Text>
          </Pressable>
          <Pressable
            onPress={reset}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-[#233554] bg-[#111a2e] py-3"
          >
            <AppIcon name="replay" size={20} color={colors.textSecondary} />
            <Text className="text-sm font-semibold text-text-secondary">Restablecer filtros</Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomNav active="filters" onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}
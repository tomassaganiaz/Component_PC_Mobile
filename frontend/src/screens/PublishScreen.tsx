import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import { Segmented } from '../components/ui';
import { createProduct } from '../services/api';
import { colors, glow, shadow } from '../theme';
import type { Nav } from '../types';

const CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: 'cpu', label: 'Procesador', icon: 'memory' },
  { value: 'gpu', label: 'GPU', icon: 'developer_board' },
  { value: 'phone', label: 'Smartphone', icon: 'smartphone' },
  { value: 'motherboard', label: 'Motherboard', icon: 'developer_board' },
  { value: 'ram', label: 'RAM', icon: 'memory' },
  { value: 'storage', label: 'Almacenamiento', icon: 'storage' },
  { value: 'monitor', label: 'Monitor', icon: 'screenshot_monitor' },
  { value: 'other', label: 'Otro', icon: 'hardware' },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
      {children}
    </Text>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  multiline,
  numeric,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  numeric?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      keyboardType={numeric ? 'numeric' : 'default'}
      className={`w-full rounded-xl border border-line bg-panel px-3 text-sm text-text-primary ${
        multiline ? 'min-h-[84px] py-3' : 'py-2.5'
      }`}
    />
  );
}

export default function PublishScreen({ nav }: { nav: Nav }) {
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('cpu');
  const [condition, setCondition] = useState(0);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [usageType, setUsageType] = useState('');
  const [hours, setHours] = useState('');
  const [reportedHours, setReportedHours] = useState('');
  const [physicalState, setPhysicalState] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  const handlePublish = async () => {
    setError(null);
    if (title.trim().length < 5) {
      setError('El título debe tener al menos 5 caracteres.');
      return;
    }
    const parsedPrice = Number(price);
    if (!price.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Ingresá un precio válido mayor a 0.');
      return;
    }
    if (description.trim().length < 10) {
      setError('La descripción debe tener al menos 10 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createProduct({
        title: title.trim(),
        description: description.trim(),
        price: parsedPrice,
        condition: condition === 0 ? 'new' : 'used',
        category,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        usageType: usageType.trim() || undefined,
        physicalState: physicalState.trim() || undefined,
        hoursOfUse: hours.trim() ? Number(hours) : undefined,
        reportedHoursOfUse: reportedHours.trim() ? Number(reportedHours) : undefined,
      });
      setPublishedId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  if (publishedId) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader subtitle="Publicar Hardware" activeTab />
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <View
            className="h-16 w-16 items-center justify-center rounded-2xl border border-secondary/40 bg-secondary/10"
            style={glow(colors.secondary, 16, 0.3)}
          >
            <AppIcon name="check_circle" size={34} color={colors.accentEmerald} />
          </View>
          <Text className="text-2xl font-bold text-text-primary">¡Publicación enviada!</Text>
          <Text className="text-center text-sm leading-relaxed text-text-secondary">
            Tu producto entró a la cola de auditoría TechShield. Cuando el laboratorio lo chequee, aparecerá con el
            check verde en el marketplace.
          </Text>
          <View className="mt-1 rounded-lg border border-line bg-panel px-4 py-2">
            <Text className="font-mono text-[11px] text-text-secondary">ID: #{publishedId.slice(0, 8).toUpperCase()}</Text>
          </View>
          <Pressable
            onPress={() => nav.go({ name: 'explore' })}
            className="mt-2 flex-row items-center gap-2 rounded-xl bg-secondary px-5 py-3"
            style={shadow.panel}
          >
            <Text className="text-sm font-semibold text-on-secondary">Ir al Marketplace</Text>
            <AppIcon name="arrow_forward" size={18} color={colors.onSecondary} />
          </Pressable>
        </View>
        <BottomNav active="publish" onNavigate={(tab) => nav.go({ name: tab })} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="Publicar Hardware" activeTab />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-2 pt-3">
          <Text className="text-2xl font-bold text-text-primary">Publicar Componente</Text>
          <Text className="mt-1 text-xs leading-relaxed text-text-secondary">
            Envía tu hardware al kit de auditoría gratuito. Hasta que pase por los filtros de seguridad y verificación
            no aparecerá con el check en el marketplace.
          </Text>
        </View>

        <View className="flex flex-col gap-4 px-4 pt-3">
          <View>
            <FieldLabel>Título *</FieldLabel>
            <Input value={title} onChangeText={setTitle} placeholder="Ej: AMD Ryzen 7 7800X3D" />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FieldLabel>Marca</FieldLabel>
              <Input value={brand} onChangeText={setBrand} placeholder="Ej: AMD / NVIDIA" />
            </View>
            <View className="flex-1">
              <FieldLabel>Modelo</FieldLabel>
              <Input value={model} onChangeText={setModel} placeholder="Ej: 7800X3D" />
            </View>
          </View>

          <View>
            <FieldLabel>Categoría *</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = category === cat.value;
                return (
                  <Pressable
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    className="flex-row items-center gap-1.5 rounded-xl border px-3 py-2"
                    style={{
                      borderColor: active ? colors.primary : colors.line,
                      backgroundColor: active ? colors.primarySoft : colors.panel,
                      ...(active ? glow(colors.primary, 8, 0.15) : undefined),
                    }}
                  >
                    <AppIcon name={cat.icon} size={15} color={active ? colors.primary : colors.textSecondary} />
                    <Text className="font-mono text-[11px] font-semibold" style={{ color: active ? colors.primary : colors.textSecondary }}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <FieldLabel>Estado *</FieldLabel>
            <Segmented options={['Nuevo / Sellado', 'Usado']} value={condition} onChange={setCondition} />
          </View>

          <View>
            <FieldLabel>Precio (USD) *</FieldLabel>
            <Input value={price} onChangeText={setPrice} placeholder="Ej: 340" numeric />
          </View>

          <View>
            <FieldLabel>Descripción *</FieldLabel>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="Estado físico, accesorios incluidos, historial de uso..."
              multiline
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FieldLabel>Horas de uso verificadas</FieldLabel>
              <Input value={hours} onChangeText={setHours} placeholder="Ej: 320" numeric />
            </View>
            <View className="flex-1">
              <FieldLabel>Horas declaradas</FieldLabel>
              <Input value={reportedHours} onChangeText={setReportedHours} placeholder="Ej: 350" numeric />
            </View>
          </View>

          <View>
            <FieldLabel>Tipo de uso</FieldLabel>
            <Input value={usageType} onChangeText={setUsageType} placeholder="Ej: Gaming / Oficina / Minería" />
          </View>

          <View>
            <FieldLabel>Estado físico</FieldLabel>
            <Input
              value={physicalState}
              onChangeText={setPhysicalState}
              placeholder="Rayones, marcas, detalles..."
              multiline
            />
          </View>

          {error ? (
            <View className="flex-row items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
              <AppIcon name="report" size={18} color={colors.diagnosticRed} />
              <Text className="flex-1 text-xs leading-relaxed text-red-400">{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handlePublish}
            disabled={submitting}
            className="flex-row items-center justify-center gap-2 rounded-xl bg-secondary py-3.5"
            style={{ ...shadow.panel, ...(submitting ? { opacity: 0.7 } : undefined) }}
          >
            {submitting ? (
              <AppIcon name="sync" size={20} color={colors.onSecondary} />
            ) : (
              <AppIcon name="verified" size={20} color={colors.onSecondary} />
            )}
            <Text className="text-base font-semibold text-on-secondary">
              {submitting ? 'Publicando...' : 'Publicar y Enviar a Auditoría'}
            </Text>
          </Pressable>

          <View className="flex-row items-start gap-2.5 rounded-lg border border-line bg-panel p-3">
            <AppIcon name="security" size={18} color={colors.accentEmerald} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-xs leading-relaxed text-text-secondary">
              Al publicar aceptás el envío del componente al centro técnico TechShield para auditoría de pines,
              telemetría térmica y estrés de silicio.
            </Text>
          </View>
        </View>
      </ScrollView>

      <BottomNav active="publish" onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import AppIcon from './AppIcon';
import { useI18n } from '../i18n';
import { createReview } from '../services/api';
import type { OrderItem, ReviewType } from '../services/api';
import { colors, glow, shadow } from '../theme';

const TYPES: { value: ReviewType; label: string; tone: string }[] = [
  { value: 'positive', label: 'Positiva', tone: colors.accentEmerald },
  { value: 'neutral', label: 'Neutral', tone: colors.accentCyan },
  { value: 'complaint', label: 'Queja', tone: colors.diagnosticRed },
];

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View className="flex-row items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} className="p-0.5">
          <AppIcon
            name={n <= value ? 'star' : 'star_border'}
            size={30}
            color={n <= value ? colors.diagnosticAmber : colors.textMuted}
          />
        </Pressable>
      ))}
    </View>
  );
}

export default function ReviewModal({
  visible,
  order,
  onClose,
  onSubmitted,
}: {
  visible: boolean;
  order: OrderItem | null;
  onClose: () => void;
  onSubmitted: (orderId: string) => void;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<ReviewType>('positive');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [complaintReason, setComplaintReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setType('positive');
    setRating(5);
    setComment('');
    setComplaintReason('');
    setError(null);
    setDone(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!order) return;
    setError(null);
    if (type === 'complaint' && complaintReason.trim().length < 20) {
      setError('La razón de la queja debe tener al menos 20 caracteres.');
      return;
    }
    if (comment.trim() && comment.trim().length < 10) {
      setError('El comentario debe tener al menos 10 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      await createReview({
        productId: order.productId,
        orderId: order.id,
        rating,
        type,
        comment: comment.trim() || undefined,
        complaintReason: type === 'complaint' ? complaintReason.trim() : undefined,
      });
      setDone(true);
      onSubmitted(order.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la reseña.');
    } finally {
      setSubmitting(false);
    }
  };

  const title = order?.product?.title ?? (order ? `Orden #${order.id.slice(0, 8).toUpperCase()}` : '');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 items-center justify-end bg-black/70">
        <View className="w-full rounded-t-3xl border-t border-line bg-panel p-5" style={shadow.bottom}>
          {done ? (
            <View className="flex flex-col items-center gap-3 py-6">
              <View
                className="h-16 w-16 items-center justify-center rounded-2xl border border-secondary/40 bg-secondary/10"
                style={glow(colors.secondary, 18, 0.35)}
              >
                <AppIcon name="check_circle" size={34} color={colors.accentEmerald} />
              </View>
              <Text className="text-xl font-bold text-text-primary">{t('review.thanks')}</Text>
              <Text className="text-center text-xs leading-relaxed text-text-secondary">
                Tu opinión ayuda a la comunidad a vender y comprar con más seguridad.
              </Text>
              <Pressable
                onPress={handleClose}
                className="mt-2 w-full items-center justify-center rounded-xl bg-secondary py-3"
              >
                <Text className="text-sm font-semibold text-on-secondary">Cerrar</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row items-center gap-2">
                <AppIcon name="star" size={20} color={colors.diagnosticAmber} />
                <Text className="text-lg font-semibold text-text-primary">{t('review.title')}</Text>
              </View>
              <Text className="mt-1 truncate text-xs text-text-secondary">{title}</Text>

              <Text className="mb-1.5 mt-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Tipo de reseña
              </Text>
              <View className="flex-row gap-2">
                {TYPES.map((t) => {
                  const active = type === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setType(t.value)}
                      className="flex-1 items-center rounded-xl border px-2 py-2.5"
                      style={{
                        borderColor: active ? t.tone : colors.line,
                        backgroundColor: active ? t.tone + '1a' : colors.panel,
                      }}
                    >
                      <Text className="font-mono text-[11px] font-semibold" style={{ color: active ? t.tone : colors.textSecondary }}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="mb-1.5 mt-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Calificación general
              </Text>
              <Stars value={rating} onChange={setRating} />

              <Text className="mb-1.5 mt-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{t('review.comment')}</Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Contanos cómo fue la experiencia (mín. 10 caracteres)"
                placeholderTextColor={colors.textMuted}
                multiline
                className="min-h-[80px] w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-text-primary"
              />

              {type === 'complaint' ? (
                <>
                  <Text className="mb-1.5 mt-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Razón de la queja *
                  </Text>
                  <TextInput
                    value={complaintReason}
                    onChangeText={setComplaintReason}
                    placeholder="Detallá el problema (mín. 20 caracteres)"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    className="min-h-[80px] w-full rounded-xl border border-red-500/40 bg-danger-soft px-3 py-2.5 text-sm text-text-primary"
                  />
                </>
              ) : null}

              {error ? (
                <View className="mt-3 flex-row items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                  <AppIcon name="report" size={18} color={colors.diagnosticRed} />
                  <Text className="flex-1 text-xs leading-relaxed text-red-400">{error}</Text>
                </View>
              ) : null}

              <View className="mt-4 flex-row gap-2 pb-4">
                <Pressable
                  onPress={handleClose}
                  className="flex-1 items-center justify-center rounded-xl border border-line bg-panel py-3"
                >
                  <Text className="text-sm font-semibold text-text-secondary">Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-secondary py-3"
                  style={submitting ? { opacity: 0.7 } : undefined}
                >
                  {submitting ? (
                    <AppIcon name="sync" size={18} color={colors.onSecondary} />
                  ) : (
                    <AppIcon name="star" size={18} color={colors.onSecondary} />
                  )}
                  <Text className="text-sm font-semibold text-on-secondary">
                    {submitting ? t('review.submitting') : t('review.submit')}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
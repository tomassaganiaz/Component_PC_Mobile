import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import { useI18n } from '../i18n';
import { getWallet, requestPayout } from '../services/api';
import type { WalletData } from '../services/api';
import { colors, glow } from '../theme';
import type { Nav } from '../types';

const ENTRY_META: Record<string, { icon: string; color: string; sign: string }> = {
  credit: { icon: 'south_west', color: colors.accentEmerald, sign: '+' },
  debit: { icon: 'north_east', color: colors.diagnosticRed, sign: '-' },
  payout: { icon: 'account_balance', color: colors.accentCyan, sign: '-' },
};

export default function WalletScreen({ nav }: { nav: Nav }) {
  const { t } = useI18n();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setWallet(await getWallet());
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getWallet();
        if (!cancelled) setWallet(data);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRequestPayout = async () => {
    const value = Number(amount);
    if (!amount.trim() || Number.isNaN(value) || value <= 0) {
      setError(t('wallet.errAmount'));
      return;
    }
    setRequesting(true);
    setError(null);
    setMessage(null);
    try {
      await requestPayout(value);
      setMessage(t('wallet.requested'));
      setAmount('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('wallet.errPayout'));
    } finally {
      setRequesting(false);
    }
  };

  const balance = wallet?.balance ?? 0;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={t('wallet.subtitle')} activeTab />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pb-3 pt-3">
          <Text className="text-2xl font-bold text-text-primary">{t('wallet.title')}</Text>

          <View
            className="mt-3 flex-col gap-1 rounded-xl border border-secondary/40 bg-secondary/10 p-4"
            style={glow(colors.secondary, 12, 0.15)}
          >
            <Text className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
              {t('wallet.available')}
            </Text>
            <Text className="text-3xl font-bold text-text-primary">
              ${Number(balance).toFixed(2)}
            </Text>
            <Text className="text-xs leading-relaxed text-text-secondary">{t('wallet.desc')}</Text>
          </View>
        </View>

        {/* Request payout */}
        <View className="px-4">
          <Text className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            {t('wallet.requestPayout')}
          </Text>
          <View className="flex-row gap-2">
            <TextInput
              value={amount}
              onChangeText={(v) => {
                setAmount(v);
                setError(null);
                setMessage(null);
              }}
              placeholder={t('wallet.amountPh')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              className="flex-1 rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-text-primary"
            />
            <Pressable
              onPress={handleRequestPayout}
              disabled={requesting}
              className="items-center justify-center rounded-xl bg-secondary px-4"
              style={requesting ? { opacity: 0.7 } : undefined}
            >
              {requesting ? (
                <AppIcon name="sync" size={16} color={colors.onSecondary} />
              ) : (
                <Text className="text-xs font-semibold text-on-secondary">{t('wallet.withdraw')}</Text>
              )}
            </Pressable>
          </View>
          {error ? <Text className="mt-2 text-xs text-red-400">{error}</Text> : null}
          {message ? <Text className="mt-2 text-xs text-emerald-400">{message}</Text> : null}
        </View>

        {/* Entries */}
        <View className="px-4 pt-5">
          <Text className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            {t('wallet.movements')} ({wallet?.entries.length ?? 0})
          </Text>

          {loading ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator color={colors.secondary} size="large" />
            </View>
          ) : !wallet || wallet.entries.length === 0 ? (
            <View className="flex-row items-center gap-2.5 rounded-xl border border-line bg-panel p-3">
              <AppIcon name="account_balance_wallet" size={18} color={colors.textMuted} />
              <Text className="flex-1 text-xs leading-relaxed text-text-secondary">
                {t('wallet.empty')}
              </Text>
            </View>
          ) : (
            <View className="flex flex-col gap-2">
              {wallet.entries.map((entry) => {
                const meta = ENTRY_META[entry.type] ?? ENTRY_META.credit;
                return (
                  <View key={entry.id} className="flex-row items-center gap-3 rounded-xl border border-line bg-panel p-3">
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-elevated">
                      <AppIcon name={meta.icon} size={17} color={meta.color} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="truncate text-sm font-semibold text-text-primary">{entry.description}</Text>
                      <Text className="font-mono text-[11px] text-text-muted">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text className="font-mono text-sm font-bold" style={{ color: meta.color }}>
                      {meta.sign}${Number(entry.amount).toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Payouts */}
        {wallet && wallet.payouts.length > 0 ? (
          <View className="px-4 pt-5">
            <Text className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              {t('wallet.payouts')} ({wallet.payouts.length})
            </Text>
            <View className="flex flex-col gap-2">
              {wallet.payouts.map((p) => (
                <View key={p.id} className="flex-row items-center justify-between rounded-xl border border-line bg-panel p-3">
                  <Text className="font-mono text-xs text-text-secondary">
                    #{p.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="font-mono text-sm font-semibold text-text-primary">
                      ${Number(p.amount).toFixed(2)}
                    </Text>
                    <View className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5">
                      <Text className="font-mono text-[10px] font-semibold uppercase text-amber-400">
                        {p.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <BottomNav active="profile" onNavigate={(tab) => nav.go({ name: tab })} />
    </View>
  );
}

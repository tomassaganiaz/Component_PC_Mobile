import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import ProductDetailScreen from '../../screens/ProductDetailScreen';
import { findProduct } from '../../data/mock';
import { createNav } from '../../navigation';
import { getProduct } from '../../services/api';
import { colors } from '../../theme';
import { toExploreCard } from '../../utils/product';

export default function ProductRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = typeof id === 'string' ? id : undefined;
  const [product, setProduct] = useState(() => findProduct(productId));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    (async () => {
      try {
        const api = await getProduct(productId);
        if (cancelled) return;
        setProduct(toExploreCard(api));
      } catch {
        if (cancelled) return;
        setProduct(findProduct(productId));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-surface">
        <ActivityIndicator color={colors.secondary} size="large" />
        <Text className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
          Cargando producto...
        </Text>
      </View>
    );
  }

  return <ProductDetailScreen nav={createNav()} product={product} />;
}
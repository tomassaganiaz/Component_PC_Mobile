import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Head from 'expo-router/head';
import { router, useLocalSearchParams } from 'expo-router';

import AppIcon from '../../components/AppIcon';
import ProductDetailScreen from '../../screens/ProductDetailScreen';
import { findProduct } from '../../data/mock';
import { useTrack } from '../../hooks/useTrack';
import { createNav } from '../../navigation';
import { ApiError, getProduct } from '../../services/api';
import { colors } from '../../theme';
import { toExploreCard } from '../../utils/product';
import type { ExploreCard } from '../../types';

export default function ProductRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = typeof id === 'string' ? id : undefined;
  const [product, setProduct] = useState<ExploreCard | null>(null);
  const [loadError, setLoadError] = useState<'notFound' | 'network' | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);
  const trackEvent = useTrack();

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    (async () => {
      try {
        const api = await getProduct(productId);
        if (cancelled) return;
        setProduct(toExploreCard(api));
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        // Solo se usa el mock si el id EXISTE en la data local (modo demo u
        // offline). Nunca se muestra un producto distinto al pedido: antes,
        // un 404 caía en PRODUCTS[0] y se ofrecía a la venta otro artículo.
        const mock = findProduct(productId);
        if (mock.id === productId) {
          setProduct(mock);
          setLoadError(null);
        } else {
          const status = err instanceof ApiError ? err.status : 0;
          setLoadError(status === 0 ? 'network' : 'notFound');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, retryNonce]);

  useEffect(() => {
    if (loading || !product) return;
    trackEvent('product_view', { productId: product.id, metadata: { title: product.title, price: product.price } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleRetry = () => {
    setLoadError(null);
    setLoading(true);
    setRetryNonce((n) => n + 1);
  };

  const renderProblem = (kind: 'notFound' | 'network') => (
    <View className="flex-1 items-center justify-center gap-3 bg-surface px-8">
      <AppIcon name={kind === 'notFound' ? 'block' : 'sync'} size={36} color={colors.textMuted} />
      <Text className="text-base font-semibold text-text-primary">
        {kind === 'notFound' ? 'Producto no encontrado' : 'No se pudo cargar el producto'}
      </Text>
      <Text className="max-w-[300px] text-center text-xs leading-relaxed text-text-secondary">
        {kind === 'notFound'
          ? 'El producto puede haber sido eliminado o el enlace no es válido.'
          : 'Revisá tu conexión e intentá nuevamente.'}
      </Text>
      <Pressable
        onPress={() => {
          if (kind === 'notFound') {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          } else {
            handleRetry();
          }
        }}
        className="mt-2 rounded-xl bg-secondary px-5 py-2.5"
      >
        <Text className="text-sm font-semibold text-on-secondary">
          {kind === 'notFound' ? 'Volver al inicio' : 'Reintentar'}
        </Text>
      </Pressable>
    </View>
  );

  if (!productId) {
    return renderProblem('notFound');
  }

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

  if (!product) {
    return renderProblem(loadError === 'network' ? 'network' : 'notFound');
  }

  return (
    <>
      <Head>
        <title>{product.title} · TechShield</title>
        <meta
          name="description"
          content={`${product.title} — ${product.verified ? 'chequeado para compra' : 'en auditoría'} con custodia escrow y garantía TechShield.`}
        />
        <meta property="og:title" content={`${product.title} · TechShield`} />
        <meta property="og:type" content="product" />
      </Head>
      <ProductDetailScreen nav={createNav()} product={product} />
    </>
  );
}

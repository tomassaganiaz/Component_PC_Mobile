import { useState } from 'react';
import { View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import AppIcon from './AppIcon';
import { colors } from '../theme';
import { optimizedImageUrl } from '../utils/image';

interface Props {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain';
  icon?: string;
  iconSize?: number;
  backgroundColor?: string;
  /** Ancho lógico para optimizar (resize+WebP). Si se omite, usa la URL original. */
  width?: number;
  /** Imagen above-the-fold: prioriza su carga (mejora LCP). */
  priority?: boolean;
}

export default function ProductImage({
  uri,
  style,
  contentFit = 'cover',
  icon = 'hardware',
  iconSize = 32,
  backgroundColor = colors.surfaceLow,
  width,
  priority = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const showFallback = !uri || failed;
  const source = width && uri ? optimizedImageUrl(uri, width) : uri;

  if (showFallback) {
    return (
      <View
        style={[
          { alignItems: 'center', justifyContent: 'center', backgroundColor },
          style as StyleProp<ViewStyle>,
        ]}
      >
        <AppIcon name={icon} size={iconSize} color={colors.outlineVariant} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: source ?? undefined }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={180}
      priority={priority ? 'high' : 'normal'}
      recyclingKey={source}
      placeholder={{ blurhash: 'L4NqR*^+00tR~qj[4nof00Rj~qay' }}
      onError={() => setFailed(true)}
    />
  );
}
import { useState } from 'react';
import { View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import AppIcon from './AppIcon';
import { colors } from '../theme';

interface Props {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain';
  icon?: string;
  iconSize?: number;
  backgroundColor?: string;
}

export default function ProductImage({
  uri,
  style,
  contentFit = 'cover',
  icon = 'hardware',
  iconSize = 32,
  backgroundColor = '#131c2e',
}: Props) {
  const [failed, setFailed] = useState(false);
  const showFallback = !uri || failed;

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
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={180}
      recyclingKey={uri}
      placeholder={{ blurhash: 'L4NqR*^+00tR~qj[4nof00Rj~qay' }}
      onError={() => setFailed(true)}
    />
  );
}
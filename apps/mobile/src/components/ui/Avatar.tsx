import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { colors, radius } from '@/theme';

import { Text } from './Text';

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
}

/** Initials avatar with optional image – no external dependency. */
export function Avatar({ name, imageUrl, size = 36 }: AvatarProps) {
  const initials = name
    .replace(/[^a-zA-Z0-9äöüÄÖÜ ]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <View style={[styles.circle, { width: size, height: size }]} accessibilityLabel={`Avatar von ${name}`}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: size, height: size, borderRadius: radius.full }} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <Text variant="label" color="accent" style={{ fontSize: Math.max(11, size * 0.36) }}>
          {initials || '?'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

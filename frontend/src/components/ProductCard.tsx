import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, ProductCondition, ProductStatus } from '../types';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const isVerified = product.status === ProductStatus.VERIFIED;
  const isNew = product.condition === ProductCondition.NEW;

  return (
    <TouchableOpacity
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row">
        {product.images && product.images.length > 0 ? (
          <Image
            source={{ uri: product.images[0] }}
            className="w-28 h-28"
            resizeMode="cover"
          />
        ) : (
          <View className="w-28 h-28 bg-gray-200 justify-center items-center">
            <Ionicons name="image-outline" size={32} color="#9ca3af" />
          </View>
        )}

        <View className="flex-1 p-3 justify-between">
          <View>
            <View className="flex-row items-start justify-between mb-1">
              <Text className="text-base font-semibold text-gray-900 flex-1 mr-2" numberOfLines={2}>
                {product.title}
              </Text>
              <View
                className={`px-2 py-0.5 rounded-full ${
                  isNew ? 'bg-green-100' : 'bg-orange-100'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isNew ? 'text-green-700' : 'text-orange-700'
                  }`}
                >
                  {isNew ? 'Nuevo' : 'Usado'}
                </Text>
              </View>
            </View>

            {product.brand && (
              <Text className="text-gray-500 text-sm mb-1">{product.brand}</Text>
            )}
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-blue-600">
              ${product.price.toLocaleString()}
            </Text>

            {isVerified && (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text className="text-green-600 text-xs ml-1 font-medium">Verificado</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

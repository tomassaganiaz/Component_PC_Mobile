import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProduct } from '../../hooks/useProducts';
import { productService } from '../../services/productService';
import { useAuth } from '../../context/AuthContext';
import { Verification, ProductCondition, VerificationResult } from '../../types';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { product, isLoading, error } = useProduct(id);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (product?.condition === ProductCondition.USED) {
      loadVerifications();
    }
  }, [product]);

  const loadVerifications = async () => {
    try {
      const data = await productService.getVerifications(id);
      setVerifications(data);
    } catch (err) {
      console.error('Error loading verifications:', err);
    }
  };

  const handleBuy = () => {
    if (!isAuthenticated) {
      Alert.alert('Iniciar sesión', 'Debes iniciar sesión para comprar', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar sesión', onPress: () => router.push('/login') },
      ]);
      return;
    }
    router.push(`/checkout/${id}`);
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View className="flex-1 justify-center items-center px-4">
        <Text className="text-red-500 text-center">{error || 'Producto no encontrado'}</Text>
      </View>
    );
  }

  const isVerified = verifications.some((v) => v.result === VerificationResult.PASS);

  return (
    <View className="flex-1 bg-white">
      <ScrollView>
        <View className="bg-gray-100">
          {product.images && product.images.length > 0 ? (
            <Image
              source={{ uri: product.images[selectedImage] }}
              className="w-full h-80"
              resizeMode="contain"
            />
          ) : (
            <View className="w-full h-80 justify-center items-center bg-gray-200">
              <Ionicons name="image-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 mt-2">Sin imagen</Text>
            </View>
          )}

          {product.images && product.images.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="px-4 py-3"
            >
              {product.images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedImage(index)}
                  className={`mr-2 border-2 rounded-lg overflow-hidden ${
                    selectedImage === index ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <Image source={{ uri: image }} className="w-16 h-16" resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View className="p-4">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-2xl font-bold text-gray-900 flex-1 mr-2">
              {product.title}
            </Text>
            <View
              className={`px-3 py-1 rounded-full ${
                product.condition === ProductCondition.NEW ? 'bg-green-100' : 'bg-orange-100'
              }`}
            >
              <Text
                className={`font-semibold ${
                  product.condition === ProductCondition.NEW
                    ? 'text-green-700'
                    : 'text-orange-700'
                }`}
              >
                {product.condition === ProductCondition.NEW ? 'Nuevo' : 'Usado'}
              </Text>
            </View>
          </View>

          <Text className="text-3xl font-bold text-blue-600 mb-4">
            ${product.price.toLocaleString()}
          </Text>

          {product.condition === ProductCondition.USED && isVerified && (
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
              <Text className="text-green-700 font-semibold ml-2">
                Producto Verificado por ERS
              </Text>
            </View>
          )}

          {product.brand && (
            <View className="flex-row items-center mb-2">
              <Text className="text-gray-500 w-20">Marca:</Text>
              <Text className="text-gray-900 font-medium">{product.brand}</Text>
            </View>
          )}

          {product.model && (
            <View className="flex-row items-center mb-2">
              <Text className="text-gray-500 w-20">Modelo:</Text>
              <Text className="text-gray-900 font-medium">{product.model}</Text>
            </View>
          )}

          {product.condition === ProductCondition.USED && product.hoursOfUse && (
            <View className="flex-row items-center mb-2">
              <Text className="text-gray-500 w-24">Horas de uso:</Text>
              <Text className="text-gray-900 font-medium">{product.hoursOfUse}h</Text>
            </View>
          )}

          {product.condition === ProductCondition.USED && product.physicalState && (
            <View className="flex-row items-center mb-4">
              <Text className="text-gray-500 w-24">Estado físico:</Text>
              <Text className="text-gray-900 font-medium">{product.physicalState}</Text>
            </View>
          )}

          <Text className="text-lg font-semibold text-gray-900 mb-2">Descripción</Text>
          <Text className="text-gray-700 leading-6 mb-6">{product.description}</Text>

          {product.condition === ProductCondition.USED && verifications.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Informe de Verificación
              </Text>
              {verifications.map((verification) => (
                <View
                  key={verification.id}
                  className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-200"
                >
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name={
                        verification.result === VerificationResult.PASS
                          ? 'checkmark-circle'
                          : verification.result === VerificationResult.FAIL
                          ? 'close-circle'
                          : 'alert-circle'
                      }
                      size={20}
                      color={
                        verification.result === VerificationResult.PASS
                          ? '#16a34a'
                          : verification.result === VerificationResult.FAIL
                          ? '#dc2626'
                          : '#f59e0b'
                      }
                    />
                    <Text className="ml-2 font-semibold">
                      {verification.result === VerificationResult.PASS
                        ? 'Aprobado'
                        : verification.result === VerificationResult.FAIL
                        ? 'Rechazado'
                        : 'Condicional'}
                    </Text>
                  </View>
                  <Text className="text-gray-700">{verification.notes}</Text>
                  {verification.functionalTest && (
                    <Text className="text-gray-600 mt-1">
                      Prueba funcional: {verification.functionalTest}
                    </Text>
                  )}
                  {verification.cosmeticGrade && (
                    <Text className="text-gray-600 mt-1">
                      Grado cosmético: {verification.cosmeticGrade}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <View className="bg-gray-50 rounded-xl p-4 mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-2">Vendedor</Text>
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-500 rounded-full justify-center items-center">
                <Text className="text-white font-bold">
                  {product.seller.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="ml-3">
                <Text className="font-medium text-gray-900">{product.seller.name}</Text>
                <Text className="text-gray-500 text-sm">
                  Miembro desde {new Date(product.seller.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="bg-white border-t border-gray-200 px-4 py-4 flex-row items-center justify-between">
        <View>
          <Text className="text-gray-500 text-sm">Precio</Text>
          <Text className="text-2xl font-bold text-blue-600">
            ${product.price.toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity
          className="bg-blue-500 px-8 py-4 rounded-xl flex-row items-center"
          onPress={handleBuy}
        >
          <Ionicons name="cart" size={20} color="white" />
          <Text className="text-white font-bold text-lg ml-2">Comprar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

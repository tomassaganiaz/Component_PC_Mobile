import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '../../hooks/useProducts';
import { ProductCard } from '../../components/ProductCard';
import { ProductCondition, ProductCategory } from '../../types';

const categories = [
  { label: 'Todos', value: undefined },
  { label: 'GPU', value: ProductCategory.GPU },
  { label: 'CPU', value: ProductCategory.CPU },
  { label: 'RAM', value: ProductCategory.RAM },
  { label: 'Móviles', value: ProductCategory.PHONE },
];

const conditions = [
  { label: 'Todos', value: undefined },
  { label: 'Nuevo', value: ProductCondition.NEW },
  { label: 'Usado', value: ProductCondition.USED },
];

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | undefined>();
  const [selectedCondition, setSelectedCondition] = useState<ProductCondition | undefined>();

  const { products, isLoading, error, refetch } = useProducts({
    search: search || undefined,
    category: selectedCategory,
    condition: selectedCondition,
  });

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900 mb-4">ERS Components</Text>

        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 mb-4">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 text-base"
            placeholder="Buscar componentes..."
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`mr-2 px-4 py-2 rounded-full ${
                selectedCategory === item.value ? 'bg-blue-500' : 'bg-gray-200'
              }`}
              onPress={() => setSelectedCategory(item.value)}
            >
              <Text
                className={`${
                  selectedCategory === item.value ? 'text-white' : 'text-gray-700'
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          className="mb-3"
        />

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={conditions}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`mr-2 px-4 py-2 rounded-full ${
                selectedCondition === item.value ? 'bg-green-500' : 'bg-gray-200'
              }`}
              onPress={() => setSelectedCondition(item.value)}
            >
              <Text
                className={`${
                  selectedCondition === item.value ? 'text-white' : 'text-gray-700'
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-red-500 text-center mb-4">{error}</Text>
          <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg" onPress={refetch}>
            <Text className="text-white font-semibold">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          )}
          contentContainerClassName="p-4"
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Ionicons name="search-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 mt-4 text-lg">No se encontraron productos</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

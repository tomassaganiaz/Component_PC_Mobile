import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../../services/productService';
import { ProductCondition, ProductCategory } from '../../types';

const categoryOptions = [
  { label: 'GPU', value: ProductCategory.GPU },
  { label: 'CPU', value: ProductCategory.CPU },
  { label: 'RAM', value: ProductCategory.RAM },
  { label: 'Almacenamiento', value: ProductCategory.STORAGE },
  { label: 'Motherboard', value: ProductCategory.MOTHERBOARD },
  { label: 'Fuente', value: ProductCategory.PSU },
  { label: 'Gabinete', value: ProductCategory.CASE },
  { label: 'Refrigeración', value: ProductCategory.COOLING },
  { label: 'Monitor', value: ProductCategory.MONITOR },
  { label: 'Teclado', value: ProductCategory.KEYBOARD },
  { label: 'Mouse', value: ProductCategory.MOUSE },
  { label: 'Celular', value: ProductCategory.PHONE },
  { label: 'Tablet', value: ProductCategory.TABLET },
  { label: 'Otro', value: ProductCategory.OTHER },
];

export default function PublishScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<ProductCondition>(ProductCondition.NEW);
  const [category, setCategory] = useState<ProductCategory>(ProductCategory.GPU);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [hoursOfUse, setHoursOfUse] = useState('');
  const [physicalState, setPhysicalState] = useState('');

  const handleSubmit = async () => {
    if (!title || !description || !price) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      setIsLoading(true);
      await productService.create({
        title,
        description,
        price: parseFloat(price),
        condition,
        category,
        brand: brand || undefined,
        model: model || undefined,
        hoursOfUse: condition === ProductCondition.USED ? parseInt(hoursOfUse) || undefined : undefined,
        physicalState: condition === ProductCondition.USED ? physicalState || undefined : undefined,
      });

      Alert.alert('Éxito', 'Producto publicado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error al publicar producto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Publicar Producto</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-lg font-semibold text-gray-900 mb-3">Condición</Text>
        <View className="flex-row mb-6">
          <TouchableOpacity
            className={`flex-1 mr-2 py-3 rounded-xl items-center ${
              condition === ProductCondition.NEW ? 'bg-blue-500' : 'bg-gray-200'
            }`}
            onPress={() => setCondition(ProductCondition.NEW)}
          >
            <Text
              className={`font-semibold ${
                condition === ProductCondition.NEW ? 'text-white' : 'text-gray-700'
              }`}
            >
              Nuevo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 ml-2 py-3 rounded-xl items-center ${
              condition === ProductCondition.USED ? 'bg-orange-500' : 'bg-gray-200'
            }`}
            onPress={() => setCondition(ProductCondition.USED)}
          >
            <Text
              className={`font-semibold ${
                condition === ProductCondition.USED ? 'text-white' : 'text-gray-700'
              }`}
            >
              Usado
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-lg font-semibold text-gray-900 mb-3">Categoría</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          {categoryOptions.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              className={`mr-2 px-4 py-2 rounded-full ${
                category === cat.value ? 'bg-blue-500' : 'bg-gray-200'
              }`}
              onPress={() => setCategory(cat.value)}
            >
              <Text
                className={`${
                  category === cat.value ? 'text-white' : 'text-gray-700'
                }`}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text className="text-sm font-medium text-gray-700 mb-1">Título *</Text>
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-base"
          placeholder="Ej: RTX 3080 Ti en excelente estado"
          value={title}
          onChangeText={setTitle}
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Descripción *</Text>
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-base"
          placeholder="Describe tu producto en detalle..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Precio (USD) *</Text>
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-base"
          placeholder="0.00"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Marca</Text>
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-base"
          placeholder="Ej: NVIDIA, Samsung, Apple"
          value={brand}
          onChangeText={setBrand}
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Modelo</Text>
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-base"
          placeholder="Ej: RTX 3080 Ti, Galaxy S23"
          value={model}
          onChangeText={setModel}
        />

        {condition === ProductCondition.USED && (
          <>
            <Text className="text-sm font-medium text-gray-700 mb-1">Horas de uso</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-base"
              placeholder="Ej: 500"
              value={hoursOfUse}
              onChangeText={setHoursOfUse}
              keyboardType="numeric"
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Estado físico</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-base"
              placeholder="Describe el estado físico del producto"
              value={physicalState}
              onChangeText={setPhysicalState}
            />
          </>
        )}

        <TouchableOpacity
          className={`bg-blue-500 rounded-xl py-4 items-center mb-8 ${
            isLoading ? 'opacity-70' : ''
          }`}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Publicar Producto</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

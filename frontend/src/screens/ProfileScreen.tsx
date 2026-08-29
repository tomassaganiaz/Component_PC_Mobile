import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { OrderStatus } from '../../types';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { orders, isLoading: ordersLoading } = useOrders();

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  if (authLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-8">
        <Ionicons name="person-circle-outline" size={80} color="#9ca3af" />
        <Text className="text-2xl font-bold text-gray-900 mt-4 mb-2">
          Inicia sesión
        </Text>
        <Text className="text-gray-500 text-center mb-8">
          Inicia sesión para ver tu perfil, publicar productos y realizar compras
        </Text>
        <TouchableOpacity
          className="bg-blue-500 w-full py-4 rounded-xl items-center mb-3"
          onPress={() => router.push('/login')}
        >
          <Text className="text-white font-bold text-lg">Iniciar Sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="w-full py-4 rounded-xl items-center border border-blue-500"
          onPress={() => router.push('/register')}
        >
          <Text className="text-blue-500 font-bold text-lg">Crear Cuenta</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-yellow-100 text-yellow-700';
      case OrderStatus.PAID:
        return 'bg-blue-100 text-blue-700';
      case OrderStatus.SHIPPED:
        return 'bg-purple-100 text-purple-700';
      case OrderStatus.DELIVERED:
        return 'bg-green-100 text-green-700';
      case OrderStatus.CANCELLED:
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'Pendiente';
      case OrderStatus.PAID:
        return 'Pagado';
      case OrderStatus.SHIPPED:
        return 'Enviado';
      case OrderStatus.DELIVERED:
        return 'Entregado';
      case OrderStatus.CANCELLED:
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-12 pb-6">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-gray-900">Mi Perfil</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center">
          <View className="w-16 h-16 bg-blue-500 rounded-full justify-center items-center">
            <Text className="text-white text-2xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-4">
            <Text className="text-xl font-bold text-gray-900">{user.name}</Text>
            <Text className="text-gray-500">{user.email}</Text>
            <View className="bg-blue-100 px-3 py-1 rounded-full mt-1 self-start">
              <Text className="text-blue-700 text-sm font-medium capitalize">
                {user.role}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        <View className="flex-row mb-4">
          <TouchableOpacity
            className="flex-1 bg-white rounded-xl p-4 mr-2 items-center shadow-sm"
            onPress={() => router.push('/publish')}
          >
            <Ionicons name="add-circle" size={32} color="#3b82f6" />
            <Text className="text-gray-700 font-medium mt-2">Publicar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-white rounded-xl p-4 ml-2 items-center shadow-sm"
            onPress={() => router.push('/my-products')}
          >
            <Ionicons name="cube" size={32} color="#3b82f6" />
            <Text className="text-gray-700 font-medium mt-2">Mis Productos</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Mis Órdenes
        </Text>

        {ordersLoading ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : orders.length === 0 ? (
          <View className="bg-white rounded-xl p-8 items-center">
            <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
            <Text className="text-gray-500 mt-4">No tienes órdenes aún</Text>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm"
              onPress={() => router.push(`/order/${order.id}`)}
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="font-semibold text-gray-900 flex-1" numberOfLines={1}>
                  {order.product.title}
                </Text>
                <View className={`px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                  <Text className="text-sm font-medium">
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
              </View>
              <Text className="text-blue-600 font-bold text-lg">
                ${order.total.toLocaleString()}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                {new Date(order.createdAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

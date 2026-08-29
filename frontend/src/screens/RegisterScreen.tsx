import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.BUYER);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setIsLoading(true);
      await register({ name, email, password, phone: phone || undefined, role });
      Alert.alert('Éxito', 'Cuenta creada correctamente', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error al registrarse');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView className="flex-1 px-8 pt-16">
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</Text>
        <Text className="text-gray-500 mb-8">Únete a la comunidad ERS</Text>

        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
          <Ionicons name="person-outline" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-3 text-base"
            placeholder="Nombre completo"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
          <Ionicons name="mail-outline" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-3 text-base"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
          <Ionicons name="call-outline" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-3 text-base"
            placeholder="Teléfono (opcional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
          <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-3 text-base"
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-6">
          <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-3 text-base"
            placeholder="Confirmar contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
          />
        </View>

        <Text className="text-sm font-medium text-gray-700 mb-3">Quiero:</Text>
        <View className="flex-row mb-6">
          <TouchableOpacity
            className={`flex-1 mr-2 py-3 rounded-xl items-center ${
              role === UserRole.BUYER ? 'bg-blue-500' : 'bg-gray-200'
            }`}
            onPress={() => setRole(UserRole.BUYER)}
          >
            <Text
              className={`font-semibold ${
                role === UserRole.BUYER ? 'text-white' : 'text-gray-700'
              }`}
            >
              Comprar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 ml-2 py-3 rounded-xl items-center ${
              role === UserRole.SELLER ? 'bg-green-500' : 'bg-gray-200'
            }`}
            onPress={() => setRole(UserRole.SELLER)}
          >
            <Text
              className={`font-semibold ${
                role === UserRole.SELLER ? 'text-white' : 'text-gray-700'
              }`}
            >
              Vender
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className={`bg-blue-500 rounded-xl py-4 items-center mb-4 ${
            isLoading ? 'opacity-70' : ''
          }`}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Crear Cuenta</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mb-8">
          <Text className="text-gray-500">¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text className="text-blue-500 font-semibold">Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

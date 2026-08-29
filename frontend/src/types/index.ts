export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
}

export enum ProductCondition {
  NEW = 'new',
  USED = 'used',
}

export enum ProductCategory {
  CPU = 'cpu',
  GPU = 'gpu',
  RAM = 'ram',
  STORAGE = 'storage',
  MOTHERBOARD = 'motherboard',
  PSU = 'psu',
  CASE = 'case',
  COOLING = 'cooling',
  MONITOR = 'monitor',
  KEYBOARD = 'keyboard',
  MOUSE = 'mouse',
  PHONE = 'phone',
  TABLET = 'tablet',
  OTHER = 'other',
}

export enum ProductStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  VERIFIED = 'verified',
  PUBLISHED = 'published',
  SOLD = 'sold',
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: ProductCondition;
  category: ProductCategory;
  status: ProductStatus;
  images: string[];
  hoursOfUse?: number;
  physicalState?: string;
  brand?: string;
  model?: string;
  seller: User;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface Order {
  id: string;
  total: number;
  status: OrderStatus;
  shippingAddress?: string;
  paymentMethod?: string;
  buyer: User;
  buyerId: string;
  product: Product;
  productId: string;
  createdAt: string;
}

export enum VerificationResult {
  PASS = 'pass',
  FAIL = 'fail',
  CONDITIONAL = 'conditional',
}

export interface Verification {
  id: string;
  result: VerificationResult;
  notes: string;
  hoursOfUse?: number;
  physicalState?: string;
  functionalTest?: string;
  cosmeticGrade?: string;
  product: Product;
  productId: string;
  verifier: User;
  verifiedBy: string;
  createdAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
}

export interface ProductFilters {
  category?: ProductCategory;
  condition?: ProductCondition;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

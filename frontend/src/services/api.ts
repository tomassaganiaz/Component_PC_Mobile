import { API_URL } from '../config';
import type {
  ApiProduct,
  LoginResponse,
  LoginSuccess,
  OtpChallenge,
  ProductFilters,
  SellerTier,
  UserProfile,
} from '../types';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
    body: options.body,
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const data = await response.json();
      if (Array.isArray(data.message)) {
        message = data.message.join(' • ');
      } else if (typeof data.message === 'string') {
        message = data.message;
      }
    } catch {
      /* keep default message */
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function requestOtp(otpToken: string): Promise<{ otpSent: boolean; code: string }> {
  return request('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ otpToken }),
  });
}

export function verifyOtp(otpToken: string, code: string): Promise<LoginSuccess> {
  return request<LoginSuccess>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ otpToken, code }),
  });
}

export function isOtpChallenge(result: LoginResponse): result is OtpChallenge {
  return (result as OtpChallenge).requiresOtp === true;
}

export function getProfile(token: string): Promise<UserProfile> {
  return request<UserProfile>('/auth/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function verifyPhone(): Promise<UserProfile> {
  return request<UserProfile>('/auth/verify-phone', { method: 'PATCH' });
}

export function verifyIdentity(): Promise<UserProfile> {
  return request<UserProfile>('/auth/verify-identity', { method: 'PATCH' });
}

export interface PaginatedProducts {
  items: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export function getProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.condition) params.set('condition', filters.condition);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.verified === true) params.set('verified', 'true');
  if (filters.sealed === true) params.set('sealed', 'true');
  if (filters.escrow === true) params.set('escrow', 'true');
  if (filters.warranty) params.set('warranty', filters.warranty);
  if (filters.minPositivity !== undefined) params.set('minPositivity', String(filters.minPositivity));
  if (filters.maxHoursOfUse !== undefined) params.set('maxHoursOfUse', String(filters.maxHoursOfUse));
  if (filters.noMining === true) params.set('noMining', 'true');
  if (filters.hideWithComplaints === true) params.set('hideWithComplaints', 'true');
  if (filters.hideSuspicious === true) params.set('hideSuspicious', 'true');
  if (filters.sellerTier) params.set('sellerTier', filters.sellerTier);
  if (filters.search) params.set('search', filters.search);
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return request<PaginatedProducts>(`/products${qs ? `?${qs}` : ''}`);
}

export function getProduct(id: string): Promise<ApiProduct> {
  return request<ApiProduct>(`/products/${id}`);
}

export interface CreateProductInput {
  title: string;
  description: string;
  price: number;
  condition: 'new' | 'used';
  category: string;
  images?: string[];
  hoursOfUse?: number;
  reportedHoursOfUse?: number;
  usageType?: string;
  physicalState?: string;
  brand?: string;
  model?: string;
}

export function createProduct(input: CreateProductInput): Promise<ApiProduct> {
  return request<ApiProduct>('/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface SecurityProfile {
  tier: SellerTier;
  badge: 'safe' | 'intermediate' | 'unsafe';
  averageRating: number;
  totalReviews: number;
  positivity: number;
  complaintRate: number;
  complaints: number;
  acceptsTesting: boolean;
  identityVerified: boolean;
  breakdown: { positive: number; neutral: number; complaint: number };
}

export function getTrustBadge(sellerId: string): Promise<SecurityProfile> {
  return request<SecurityProfile>(`/reviews/trust-badge/${sellerId}`);
}

/* ------------------------------- Reviews -------------------------------- */

export type ReviewType = 'positive' | 'neutral' | 'complaint';

export interface ReviewItem {
  id: string;
  rating: number;
  type: ReviewType;
  status: string;
  comment?: string;
  sellerRating?: number;
  productRating?: number;
  complaintReason?: string;
  isVerifiedPurchase?: boolean;
  buyer?: { id: string; name: string };
  product?: ApiProduct;
  createdAt: string;
}

export interface CreateReviewInput {
  productId: string;
  orderId: string;
  rating: number;
  type: ReviewType;
  comment?: string;
  sellerRating?: number;
  productRating?: number;
  complaintReason?: string;
}

export function createReview(input: CreateReviewInput): Promise<ReviewItem> {
  return request<ReviewItem>('/reviews', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getSellerReviews(sellerId: string): Promise<ReviewItem[]> {
  return request<ReviewItem[]>(`/reviews/seller/${sellerId}`);
}

export interface ChatSafetyResult {
  safe: boolean;
  warnings: string[];
  sanitizedText: string;
}

export function chatSafetyCheck(text: string): Promise<ChatSafetyResult> {
  return request<ChatSafetyResult>('/chat/safety-check', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function createReport(
  reportedId: string,
  targetType: 'seller' | 'buyer',
  reason: string,
  details?: string,
): Promise<{ id: string; status: string }> {
  return request('/reports', {
    method: 'POST',
    body: JSON.stringify({ reportedId, targetType, reason, details }),
  });
}

/* ------------------------------- Orders -------------------------------- */

export interface OrderItem {
  id: string;
  total: number;
  status: string;
  shippingAddress?: string;
  paymentMethod?: string;
  custodyStartDate?: string;
  custodyEndDate?: string;
  cancellationReason?: string;
  productId: string;
  createdAt: string;
  product?: ApiProduct;
}

export interface CreateOrderInput {
  productId: string;
  shippingAddress?: string;
  paymentMethod?: string;
}

export interface OrderProtection {
  orderId: string;
  status: string;
  total: number;
  escrowUntil: string;
  coverageUntil: string;
  returnWindowOpen: boolean;
  returnDaysLeft: number;
  coverageActive: boolean;
  coverageDaysLeft: number;
  rules: {
    returnWindowDays: number;
    coverageDays: number;
    returnPolicy: string;
    coveragePolicy: string;
    damagePolicy: string;
  };
}

export function createOrder(input: CreateOrderInput): Promise<OrderItem> {
  return request<OrderItem>('/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getMyOrders(): Promise<OrderItem[]> {
  return request<OrderItem[]>('/orders');
}

export function getOrder(id: string): Promise<OrderItem> {
  return request<OrderItem>(`/orders/${id}`);
}

export function getOrderProtection(id: string): Promise<OrderProtection> {
  return request<OrderProtection>(`/orders/${id}/protection`);
}

export function requestOrderReturn(id: string, reason: string): Promise<OrderItem> {
  return request<OrderItem>(`/orders/${id}/return`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function requestOrderCoverage(id: string): Promise<{ ticketId: string; message: string }> {
  return request<{ ticketId: string; message: string }>(`/orders/${id}/coverage`, {
    method: 'POST',
  });
}
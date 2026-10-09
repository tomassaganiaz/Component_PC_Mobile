import { API_URL } from '../config';
import type {
  ApiProduct,
  AuthUser,
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
let refreshToken: string | null = null;
let onTokensRefreshed: ((access: string, refresh: string) => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setAuthTokens(access: string | null, refresh: string | null) {
  authToken = access;
  refreshToken = refresh;
}

export function setRefreshTokensCallback(cb: ((access: string, refresh: string) => void) | null) {
  onTokensRefreshed = cb;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function refreshSession(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    authToken = data.access_token;
    refreshToken = data.refresh_token;
    onTokensRefreshed?.(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
      body: options.body,
    });

  let response = await doFetch();

  // Si el access token expiró (401), se rota el refresh y se reintenta una vez.
  const noRetry =
    path.includes('/auth/login') ||
    path.includes('/auth/register') ||
    path.includes('/auth/refresh') ||
    path.includes('/auth/otp');
  if (response.status === 401 && authToken && !noRetry) {
    if (await refreshSession()) {
      response = await doFetch();
    }
  }

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

export function register(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'buyer' | 'seller';
}): Promise<AuthUser> {
  return request<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
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

export function getProfile(token?: string): Promise<UserProfile> {
  return request<UserProfile>('/auth/profile', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function logoutSession(refreshToken: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
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

/* ---------------------------- Verifications ----------------------------- */

export interface VerificationItem {
  id: string;
  result: 'pass' | 'fail' | 'conditional';
  notes: string;
  hoursOfUse?: number;
  physicalState?: string;
  functionalTest?: string;
  cosmeticGrade?: string;
  qualityScore?: number;
  productId: string;
  verifiedBy?: string;
  createdAt: string;
}

export function getProductVerifications(productId: string): Promise<VerificationItem[]> {
  return request<VerificationItem[]>(`/verifications/product/${productId}`);
}

/* ------------------------------ Analytics ------------------------------- */

export interface AnalyticsEventItem {
  id: string;
  event: string;
  page?: string;
  productId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  createdAt: string;
}

export function getAnalyticsEvents(limit = 100): Promise<AnalyticsEventItem[]> {
  return request<AnalyticsEventItem[]>(`/analytics/events?limit=${limit}`);
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
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

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
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
  if (filters.conditionGrade) params.set('conditionGrade', filters.conditionGrade);
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
  if (filters.inStock === true) params.set('inStock', 'true');
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
  stock?: number;
}

export function createProduct(input: CreateProductInput): Promise<ApiProduct> {
  return request<ApiProduct>('/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface UpdateProductInput {
  title?: string;
  description?: string;
  price?: number;
  images?: string[];
  hoursOfUse?: number;
  reportedHoursOfUse?: number;
  usageType?: string;
  physicalState?: string;
  status?: string;
  verified?: boolean;
  sealed?: boolean;
  stock?: number;
}

export function updateProduct(id: string, input: UpdateProductInput): Promise<ApiProduct> {
  return request<ApiProduct>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteProduct(id: string): Promise<void> {
  return request<void>(`/products/${id}`, { method: 'DELETE' });
}

export function getProductsBySeller(sellerId: string): Promise<ApiProduct[]> {
  return request<ApiProduct[]>(`/products/seller/${sellerId}`);
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
  buyerId?: string;
  discount?: number;
  couponCode?: string | null;
  items?: { id: string; productId: string; quantity: number; unitPrice: number; product?: ApiProduct }[];
}

export interface CreateOrderInput {
  productId: string;
  shippingAddress?: string;
  paymentMethod?: string;
  couponCode?: string;
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

export interface SellerSale {
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
  updatedAt: string;
  product?: ApiProduct;
  buyer?: { id: string; name: string; email: string } | null;
}

export function getMySales(): Promise<SellerSale[]> {
  return getMLSales().then((r) => r.sales);
}

/* ----------------------------- Mercado Libre ----------------------------- */

export type MLSalesSource = 'mercadolibre' | 'mock' | 'not_connected';

export interface MLSalesResult {
  source: MLSalesSource;
  sales: SellerSale[];
}

export interface MLStatus {
  configured: boolean;
  connected: boolean;
  mlUserId: string | null;
}

export function getMLSales(): Promise<MLSalesResult> {
  return request<MLSalesResult>('/mercadolibre/sales');
}

export function getMLStatus(): Promise<MLStatus> {
  return request<MLStatus>('/mercadolibre/status');
}

export function getMLAuthUrl(): Promise<{ url: string; configured: boolean }> {
  return request<{ url: string; configured: boolean }>('/mercadolibre/auth-url');
}

export function disconnectML(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/mercadolibre', { method: 'DELETE' });
}

export function getOrder(id: string): Promise<OrderItem> {
  return request<OrderItem>(`/orders/${id}`);
}

export function payOrder(id: string): Promise<OrderItem> {
  return request<OrderItem>(`/orders/${id}/pay`, { method: 'POST' });
}

export function shipOrder(id: string): Promise<OrderItem> {
  return request<OrderItem>(`/orders/${id}/ship`, { method: 'POST' });
}

export function deliverOrder(id: string): Promise<OrderItem> {
  return request<OrderItem>(`/orders/${id}/deliver`, { method: 'POST' });
}

export function cancelOrder(id: string): Promise<OrderItem> {
  return request<OrderItem>(`/orders/${id}/cancel`, { method: 'POST' });
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

/* ------------------------------ Reputation ------------------------------ */

export type ReputationMedal = 'none' | 'silver' | 'gold' | 'platinum';

export interface SellerReputation {
  level: number;
  color: string;
  label: string;
  medal: ReputationMedal;
  averageRating: number;
  positivity: number;
  complaintRate: number;
  totalReviews: number;
  totalSales: number;
  transactionsLast60d: number;
  cancelledLast60d: number;
  breakdown: { positive: number; neutral: number; complaint: number };
}

export function getSellerReputation(sellerId: string): Promise<SellerReputation> {
  return request<SellerReputation>(`/reviews/reputation/${sellerId}`);
}

/* ---------------------------- Notifications ----------------------------- */

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export function getNotifications(): Promise<AppNotification[]> {
  return request<AppNotification[]>('/notifications');
}

export function getUnreadNotifications(): Promise<{ count: number }> {
  return request<{ count: number }>('/notifications/unread-count');
}

export function markNotificationRead(id: string): Promise<AppNotification> {
  return request<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' });
}

/* ------------------------------- Coupons -------------------------------- */

export interface CouponValidation {
  code: string;
  type: 'percent' | 'fixed';
  discount: number;
  finalTotal: number;
}

export function validateCoupon(code: string, amount: number): Promise<CouponValidation> {
  return request<CouponValidation>('/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ code, amount }),
  });
}

/* --------------------------------- Cart --------------------------------- */

export interface CartItemData {
  id: string;
  productId: string;
  quantity: number;
  product?: ApiProduct;
}

export interface CartData {
  id: string;
  userId: string;
  items: CartItemData[];
}

export function getCart(): Promise<CartData> {
  return request<CartData>('/cart');
}

export function addToCart(productId: string, quantity = 1): Promise<CartData> {
  return request<CartData>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
}

export function updateCartItem(itemId: string, quantity: number): Promise<CartData> {
  return request<CartData>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(itemId: string): Promise<CartData> {
  return request<CartData>(`/cart/items/${itemId}`, { method: 'DELETE' });
}

export function clearCart(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/cart', { method: 'DELETE' });
}

export function checkoutCart(input: {
  shippingAddress?: string;
  paymentMethod?: string;
  couponCode?: string;
}): Promise<OrderItem> {
  return request<OrderItem>('/orders/checkout', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/* ------------------------------- Payments ------------------------------- */

export interface PaymentIntent {
  paymentId: string;
  provider: string;
  status: string;
  amount: number;
  clientSecret: string;
}

export function createPaymentIntent(orderId: string): Promise<PaymentIntent> {
  return request<PaymentIntent>(`/payments/${orderId}/intent`, { method: 'POST' });
}

/** Confirma el pago (simula el webhook de la pasarela). */
export function confirmPayment(orderId: string): Promise<{ orderId: string; status: string }> {
  return request<{ orderId: string; status: string }>('/payments/webhook', {
    method: 'POST',
    body: JSON.stringify({ orderId, event: 'payment.succeeded' }),
  });
}

/* -------------------------------- Wallet -------------------------------- */

export interface WalletEntryItem {
  id: string;
  type: 'credit' | 'debit' | 'payout';
  amount: number;
  description: string;
  orderId?: string | null;
  createdAt: string;
}

export interface PayoutItem {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface WalletData {
  balance: number;
  entries: WalletEntryItem[];
  payouts: PayoutItem[];
}

export function getWallet(): Promise<WalletData> {
  return request<WalletData>('/wallet');
}

export function requestPayout(amount: number): Promise<PayoutItem> {
  return request<PayoutItem>('/wallet/payouts', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

/* ----------------------------- Variaciones ------------------------------ */

export interface ProductVariation {
  id: string;
  sku: string;
  attributes?: Record<string, string> | null;
  stock: number;
  priceDelta: number;
}

export function getProductVariations(productId: string): Promise<ProductVariation[]> {
  return request<ProductVariation[]>(`/products/${productId}/variations`);
}

/* -------------------------------- Admin --------------------------------- */

export interface AdminOverview {
  users: number;
  products: number;
  orders: number;
  deliveredOrders: number;
  revenue: number;
  pendingComplaints: number;
  openReports: number;
}

export function getAdminOverview(): Promise<AdminOverview> {
  return request<AdminOverview>('/admin/overview');
}

/* ------------------------------- Shipping -------------------------------- */

export interface ShipmentInfo {
  id: string;
  orderId: string;
  carrier: string;
  service: string;
  trackingCode: string;
  status: string;
  cost: number;
  estimatedDays: number;
}

export function getOrderShipment(orderId: string): Promise<ShipmentInfo | null> {
  return request<ShipmentInfo | null>(`/shipping/order/${orderId}`);
}
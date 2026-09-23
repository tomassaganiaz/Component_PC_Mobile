import { API_URL } from '../config';
import type {
  ApiProduct,
  AuthUser,
  LoginResponse,
  LoginSuccess,
  OtpChallenge,
  ProductFilters,
  SellerTier,
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

export function getProfile(token: string): Promise<AuthUser> {
  return request<AuthUser>('/auth/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getProducts(filters: ProductFilters = {}): Promise<ApiProduct[]> {
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
  const qs = params.toString();
  return request<ApiProduct[]>(`/products${qs ? `?${qs}` : ''}`);
}

export function getProduct(id: string): Promise<ApiProduct> {
  return request<ApiProduct>(`/products/${id}`);
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
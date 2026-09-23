export type ScreenName =
  | 'login'
  | 'explore'
  | 'detail'
  | 'inspection'
  | 'filters'
  | 'publish'
  | 'profile';

export interface Route {
  name: ScreenName;
  productId?: string;
  product?: ExploreCard;
}

export interface Nav {
  go(route: Route): void;
  back(): void;
}

export type Tone = 'emerald' | 'cyan' | 'primary' | 'amber' | 'blue';

export type UserRole = 'buyer' | 'seller' | 'admin';

export type SellerTier = 'secure' | 'normal' | 'not_secure';

export interface SellerStats {
  total: number;
  positive: number;
  complaints: number;
  positivity: number;
  identityVerified: boolean;
}

export interface ApiProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: 'new' | 'used';
  category: string;
  status: string;
  images?: string[];
  hoursOfUse?: number;
  reportedHoursOfUse?: number;
  usageType?: string;
  stressTest?: string;
  conditionGrade?: string;
  verified: boolean;
  sealed?: boolean;
  escrowProtected?: boolean;
  coverageExtended?: boolean;
  warranty?: { days: number; extended: boolean; remainingDays: number; label: string };
  openComplaints?: number;
  priceFlag?: 'normal' | 'suspicious';
  marketAveragePrice?: number | null;
  priceDiffPct?: number | null;
  brand?: string;
  model?: string;
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
  seller?: { id: string; name: string; acceptsTesting: boolean };
  securityTier?: SellerTier;
  sellerStats?: SellerStats;
}

export interface ProductFilters {
  sellerTier?: SellerTier;
  verified?: boolean;
  sealed?: boolean;
  search?: string;
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  warranty?: 'techshield' | 'extended';
  minPositivity?: number;
  maxHoursOfUse?: number;
  noMining?: boolean;
  hideWithComplaints?: boolean;
  hideSuspicious?: boolean;
  escrow?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginSuccess {
  access_token: string;
  user: AuthUser;
}

export interface OtpChallenge {
  requiresOtp: true;
  otpToken: string;
}

export type LoginResponse = LoginSuccess | OtpChallenge;

export interface Checkpoint {
  icon: string;
  title: string;
  meta: string;
  status: 'approved' | 'running';
}

export interface InspectionStep {
  title: string;
  meta: string;
  desc: string;
  state: 'done' | 'active' | 'pending';
  icon?: string;
  percent?: string;
  checkpoints?: Checkpoint[];
}

export interface Product {
  id: string;
  category: string;
  breadcrumb: string;
  tag: string;
  tagTone: Tone;
  grade: string;
  gradeTone: 'primary' | 'secondary';
  title: string;
  subtitle: string;
  price: number;
  currency: string;
  originalPrice?: number;
  saving?: string;
  shipping?: string;
  image: string;
  gallery?: { uri: string; label: string; desc: string }[];
  intro: string;
  condition?: 'new' | 'used';
  sealed?: boolean;
  verified?: boolean;
  escrowProtected?: boolean;
  warranty?: { days: number; extended: boolean; remainingDays: number; label: string };
  openComplaints?: number;
  priceFlag?: 'normal' | 'suspicious';
  marketAveragePrice?: number | null;
  priceDiffPct?: number | null;
  identityVerified?: boolean;
  hoursOfUse?: number | null;
  reportedHoursOfUse?: number | null;
  usageType?: string;
  stressTest?: string;
  conditionGrade?: string;
  sellerTier?: SellerTier;
  sellerStats?: SellerStats;
  sellerName?: string;
  sellerId?: string;
  report?: {
    code: string;
    tests: string;
    battery?: { label: string; value: string; percent: number; subLeft: string; subRight: string };
    checklist?: { icon: string; title: string; status: string; desc: string }[];
    hash: string;
  };
  seller?: { name: string; pro: boolean; since: string; rating: string; positive: string; avatar: string };
  specs?: [string, string][];
}

export interface ExploreCard extends Product {
  escrow: string;
  telemetry: TelemetryBlock;
}

export type TelemetryBlock =
  | {
      kind: 'checklist';
      icon: string;
      title: string;
      pts: string;
      auditor: string;
      hash: string;
      satisfaction: string;
    }
  | { kind: 'battery'; label: string; value: string; percent: number; subLeft: string; subRight: string }
  | {
      kind: 'metrics';
      cells: { icon: string; tone: Tone; label: string; value: string }[];
    }
  | { kind: 'seal'; icon: string; text: string }
  | {
      kind: 'verified';
      hoursOfUse: number | null;
      reportedHoursOfUse: number | null;
      usageType?: string;
      stressTest?: string;
      conditionGrade?: string;
    }
  | { kind: 'unverified'; reason: string };
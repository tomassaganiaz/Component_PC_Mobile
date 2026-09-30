import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type { ExploreCard, ProductFilters, SellerTier } from '../types';

interface MarketplaceState {
  filters: ProductFilters;
  search: string;
  condition: number;
  tierFilter: SellerTier | undefined;
  cards: ExploreCard[];
  offline: boolean;
  loadedQueryKey: string | null;
  page: number;
  hasMore: boolean;
  total: number;
}

type MarketplaceAction =
  | { type: 'SET_FILTERS'; filters: ProductFilters }
  | { type: 'SET_SEARCH'; search: string }
  | { type: 'SET_CONDITION'; condition: number }
  | { type: 'SET_TIER'; tier: SellerTier | undefined }
  | {
      type: 'SET_RESULTS';
      cards: ExploreCard[];
      offline: boolean;
      queryKey: string;
      page: number;
      hasMore: boolean;
      total: number;
    }
  | { type: 'APPEND_RESULTS'; cards: ExploreCard[]; page: number; hasMore: boolean; total: number }
  | { type: 'RESET' };

const initialState: MarketplaceState = {
  filters: {},
  search: '',
  condition: 0,
  tierFilter: undefined,
  cards: [],
  offline: false,
  loadedQueryKey: null,
  page: 1,
  hasMore: false,
  total: 0,
};

export { initialState };

export function marketplaceReducer(state: MarketplaceState, action: MarketplaceAction): MarketplaceState {
  switch (action.type) {
    case 'SET_FILTERS':
      return { ...state, filters: action.filters, tierFilter: action.filters.sellerTier };
    case 'SET_SEARCH':
      return { ...state, search: action.search };
    case 'SET_CONDITION':
      return { ...state, condition: action.condition };
    case 'SET_TIER':
      return { ...state, tierFilter: action.tier };
    case 'SET_RESULTS':
      return {
        ...state,
        cards: action.cards,
        offline: action.offline,
        loadedQueryKey: action.queryKey,
        page: action.page,
        hasMore: action.hasMore,
        total: action.total,
      };
    case 'APPEND_RESULTS':
      return {
        ...state,
        cards: [...state.cards, ...action.cards],
        page: action.page,
        hasMore: action.hasMore,
        total: action.total,
      };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

interface MarketplaceContextValue {
  state: MarketplaceState;
  setFilters: (filters: ProductFilters) => void;
  setSearch: (search: string) => void;
  setCondition: (condition: number) => void;
  setTier: (tier: SellerTier | undefined) => void;
  setResults: (
    cards: ExploreCard[],
    offline: boolean,
    queryKey: string,
    page: number,
    hasMore: boolean,
    total: number,
  ) => void;
  appendResults: (cards: ExploreCard[], page: number, hasMore: boolean, total: number) => void;
  reset: () => void;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(marketplaceReducer, initialState);

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      state,
      setFilters: (filters) => dispatch({ type: 'SET_FILTERS', filters }),
      setSearch: (search) => dispatch({ type: 'SET_SEARCH', search }),
      setCondition: (condition) => dispatch({ type: 'SET_CONDITION', condition }),
      setTier: (tier) => dispatch({ type: 'SET_TIER', tier }),
      setResults: (cards, offline, queryKey, page, hasMore, total) =>
        dispatch({ type: 'SET_RESULTS', cards, offline, queryKey, page, hasMore, total }),
      appendResults: (cards, page, hasMore, total) =>
        dispatch({ type: 'APPEND_RESULTS', cards, page, hasMore, total }),
      reset: () => dispatch({ type: 'RESET' }),
    }),
    [state],
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace(): MarketplaceContextValue {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error('useMarketplace debe usarse dentro de <MarketplaceProvider>');
  }
  return ctx;
}
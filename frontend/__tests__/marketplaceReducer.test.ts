import { marketplaceReducer, initialState } from '../src/context/MarketplaceContext';

describe('marketplaceReducer', () => {
  it('SET_FILTERS guarda filtros y sincroniza tierFilter', () => {
    const next = marketplaceReducer(initialState, {
      type: 'SET_FILTERS',
      filters: { sellerTier: 'secure', verified: true },
    });
    expect(next.filters.sellerTier).toBe('secure');
    expect(next.tierFilter).toBe('secure');
  });

  it('SET_FILTERS con sellerTier undefined resetea tierFilter', () => {
    const state = { ...initialState, tierFilter: 'secure' as const };
    const next = marketplaceReducer(state, { type: 'SET_FILTERS', filters: {} });
    expect(next.tierFilter).toBeUndefined();
  });

  it('SET_SEARCH actualiza el término', () => {
    const next = marketplaceReducer(initialState, { type: 'SET_SEARCH', search: 'ryzen' });
    expect(next.search).toBe('ryzen');
  });

  it('SET_TIER actualiza tierFilter', () => {
    const next = marketplaceReducer(initialState, { type: 'SET_TIER', tier: 'normal' });
    expect(next.tierFilter).toBe('normal');
  });

  it('SET_CONDITION actualiza condition', () => {
    const next = marketplaceReducer(initialState, { type: 'SET_CONDITION', condition: 2 });
    expect(next.condition).toBe(2);
  });

  it('SET_RESULTS reemplaza cards y meta de paginación', () => {
    const next = marketplaceReducer(initialState, {
      type: 'SET_RESULTS',
      cards: [{ id: 'a' } as never],
      offline: false,
      queryKey: '{"page":1}',
      page: 1,
      hasMore: true,
      total: 30,
    });
    expect(next.cards).toHaveLength(1);
    expect(next.loadedQueryKey).toBe('{"page":1}');
    expect(next.page).toBe(1);
    expect(next.hasMore).toBe(true);
    expect(next.total).toBe(30);
  });

  it('APPEND_RESULTS concatena cards y actualiza la página', () => {
    const state = { ...initialState, cards: [{ id: 'a' } as never], page: 1, hasMore: true };
    const next = marketplaceReducer(state, {
      type: 'APPEND_RESULTS',
      cards: [{ id: 'b' } as never],
      page: 2,
      hasMore: false,
      total: 2,
    });
    expect(next.cards.map((c) => c.id)).toEqual(['a', 'b']);
    expect(next.page).toBe(2);
    expect(next.hasMore).toBe(false);
    expect(next.total).toBe(2);
  });

  it('RESET devuelve al estado inicial', () => {
    const state = {
      ...initialState,
      cards: [{ id: 'a' } as never],
      search: 'ryzen',
      page: 3,
      total: 40,
    };
    expect(marketplaceReducer(state, { type: 'RESET' })).toEqual(initialState);
  });
});
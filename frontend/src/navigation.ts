import { router } from 'expo-router';
import type { Nav, Route } from './types';

function routeHref(next: Route): Parameters<typeof router.push>[0] {
  switch (next.name) {
    case 'explore':
      return '/';
    case 'filters':
      return '/filters';
    case 'publish':
      return '/publish';
    case 'profile':
      return '/profile';
    case 'analytics':
      return '/analytics';
    case 'inspection':
      return next.orderId
        ? { pathname: '/inspection', params: { orderId: next.orderId } }
        : '/inspection';
    case 'detail':
      return next.productId ? { pathname: '/product/[id]', params: { id: next.productId } } : '/';
    case 'login':
      return '/login';
    default:
      return '/';
  }
}

export function createNav(): Nav {
  return {
    go: (next) => {
      const href = routeHref(next);
      if (next.name === 'login') {
        router.replace(href);
      } else {
        router.push(href);
      }
    },
    back: () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    },
  };
}
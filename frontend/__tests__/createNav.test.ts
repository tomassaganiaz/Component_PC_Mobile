import { router } from 'expo-router';

import { createNav } from '../src/navigation';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));

const mockedRouter = router as jest.Mocked<typeof router>;

beforeEach(() => {
  jest.clearAllMocks();
  (mockedRouter.canGoBack as jest.Mock).mockReturnValue(true);
});

describe('createNav', () => {
  it('navega a filtros con push', () => {
    createNav().go({ name: 'filters' });
    expect(mockedRouter.push).toHaveBeenCalledWith('/filters');
  });

  it('navega a explorar con push a la raíz', () => {
    createNav().go({ name: 'explore' });
    expect(mockedRouter.push).toHaveBeenCalledWith('/');
  });

  it('navega al detalle con el id del producto', () => {
    createNav().go({ name: 'detail', productId: 'TS-9482' });
    expect(mockedRouter.push).toHaveBeenCalledWith({
      pathname: '/product/[id]',
      params: { id: 'TS-9482' },
    });
  });

  it('navega al seguimiento con orderId', () => {
    createNav().go({ name: 'inspection', orderId: 'abc-123' });
    expect(mockedRouter.push).toHaveBeenCalledWith({
      pathname: '/inspection',
      params: { orderId: 'abc-123' },
    });
  });

  it('login usa replace', () => {
    createNav().go({ name: 'login' });
    expect(mockedRouter.replace).toHaveBeenCalledWith('/login');
  });

  it('back usa back cuando hay historial', () => {
    createNav().back();
    expect(mockedRouter.back).toHaveBeenCalled();
    expect(mockedRouter.replace).not.toHaveBeenCalled();
  });

  it('back cae a replace cuando no hay historial', () => {
    (mockedRouter.canGoBack as jest.Mock).mockReturnValueOnce(false);
    createNav().back();
    expect(mockedRouter.replace).toHaveBeenCalledWith('/');
  });
});
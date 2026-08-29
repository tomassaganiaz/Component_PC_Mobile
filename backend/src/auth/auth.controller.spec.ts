import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let usersService: UsersService;

  const mockAuthService = {
    login: jest.fn(),
    getProfile: jest.fn(),
  };

  const mockUsersService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const createUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should create a new user', async () => {
      const expectedUser = {
        id: 'uuid-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'buyer',
      };

      mockUsersService.create.mockResolvedValue(expectedUser);

      const result = await controller.register(createUserDto);

      expect(result).toEqual(expectedUser);
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return access token and user', async () => {
      const expectedResponse = {
        access_token: 'jwt-token',
        user: {
          id: 'uuid-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'buyer',
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('getProfile', () => {
    it('should return user profile from request', async () => {
      const mockRequest = {
        user: { id: 'uuid-123', email: 'test@example.com', role: 'buyer' },
      };

      const expectedProfile = {
        id: 'uuid-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'buyer',
      };

      mockAuthService.getProfile.mockResolvedValue(expectedProfile);

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(expectedProfile);
      expect(mockAuthService.getProfile).toHaveBeenCalledWith('uuid-123');
    });
  });
});

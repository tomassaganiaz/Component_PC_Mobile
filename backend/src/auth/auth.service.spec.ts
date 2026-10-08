import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshToken } from './entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(() => ({ exp: 9999999999 })),
  };

  const mockConfigService = {
    get: jest.fn((_k: string, d: unknown) => d),
  };

  const mockRefreshRepo = {
    create: jest.fn((e) => e),
    save: jest.fn(async (e) => e),
    update: jest.fn(async () => ({ affected: 1 })),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshRepo },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    const mockUser = {
      id: 'uuid-123',
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'buyer',
    };

    it('should return user without password when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.validateUser('test@example.com', 'password123');

      expect(result).toEqual({
        id: 'uuid-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'buyer',
      });
      expect(result.password).toBeUndefined();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.validateUser('nonexistent@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.validateUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'uuid-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'buyer',
    };

    it('should return access token, refresh token and user data', async () => {
      jest.spyOn(authService, 'validateUser').mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await authService.login(loginDto);

      expect(result).toMatchObject({
        access_token: 'jwt-token',
        refresh_token: 'jwt-token',
        user: {
          id: 'uuid-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'buyer',
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-123',
        email: 'test@example.com',
        role: 'buyer',
      });
      expect(mockRefreshRepo.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      jest.spyOn(authService, 'validateUser').mockRejectedValue(new UnauthorizedException());

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 'uuid-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'buyer',
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await authService.getProfile('uuid-123');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith('uuid-123');
    });
  });

  describe('refresh', () => {
    it('should rotate a valid refresh token', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'uuid-123', purpose: 'refresh' });
      mockRefreshRepo.findOne.mockResolvedValue({ id: 'rt', revoked: false });
      mockUsersService.findOne.mockResolvedValue({ id: 'uuid-123', isActive: true });
      mockRefreshRepo.save.mockResolvedValue({ id: 'new-rt' });

      const result = await authService.refresh('valid-refresh-token');

      expect(result.refresh_token).toBeDefined();
      expect(mockRefreshRepo.update).toHaveBeenCalled();
    });

    it('should throw when refresh token is revoked', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'uuid-123', purpose: 'refresh' });
      mockRefreshRepo.findOne.mockResolvedValue(null);

      await expect(authService.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);
      expect(mockUsersService.findOne).not.toHaveBeenCalled();
    });
  });
});

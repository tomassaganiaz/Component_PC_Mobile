import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: UserRole.BUYER,
    };

    it('should create a new user successfully', async () => {
      const hashedPassword = 'hashedPassword123';
      const savedUser = {
        id: 'uuid-123',
        ...createUserDto,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockRepository.create.mockReturnValue(savedUser);
      mockRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(createUserDto);

      expect(result.password).toBeUndefined();
      expect(result.email).toEqual(createUserDto.email);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 'existing-user' });

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const expectedUsers = [
        { id: 'uuid-1', name: 'User 1', email: 'user1@example.com' },
        { id: 'uuid-2', name: 'User 2', email: 'user2@example.com' },
      ];

      mockRepository.find.mockResolvedValue(expectedUsers);

      const result = await service.findAll();

      expect(result).toEqual(expectedUsers);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const expectedUser = {
        id: 'uuid-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockRepository.findOne.mockResolvedValue(expectedUser);

      const result = await service.findOne('uuid-123');

      expect(result).toEqual(expectedUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-123' } });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email with password', async () => {
      const expectedUser = {
        id: 'uuid-123',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
        role: 'buyer',
      };

      mockRepository.findOne.mockResolvedValue(expectedUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(expectedUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: ['id', 'email', 'password', 'name', 'role'],
      });
    });

    it('should return null if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto = {
      name: 'Updated Name',
    };

    it('should update a user successfully', async () => {
      const existingUser = {
        id: 'uuid-123',
        name: 'Old Name',
        email: 'test@example.com',
      };

      const updatedUser = {
        ...existingUser,
        ...updateUserDto,
      };

      mockRepository.findOne.mockResolvedValue(existingUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update('uuid-123', updateUserDto);

      expect(result.name).toEqual('Updated Name');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a user', async () => {
      const existingUser = {
        id: 'uuid-123',
        name: 'Test User',
      };

      mockRepository.findOne.mockResolvedValue(existingUser);
      mockRepository.softRemove.mockResolvedValue(existingUser);

      await service.remove('uuid-123');

      expect(mockRepository.softRemove).toHaveBeenCalledWith(existingUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});

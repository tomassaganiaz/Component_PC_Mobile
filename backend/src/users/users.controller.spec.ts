import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UserRole } from "./user.entity";

describe("UsersController", () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a user", async () => {
      const createUserDto = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      };

      const expectedUser = {
        id: "uuid-123",
        name: "Test User",
        email: "test@example.com",
        role: UserRole.BUYER,
      };

      mockUsersService.create.mockResolvedValue(expectedUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(expectedUser);
    });
  });

  describe("findAll", () => {
    it("should return an array of users", async () => {
      const expectedUsers = [
        { id: "uuid-1", name: "User 1" },
        { id: "uuid-2", name: "User 2" },
      ];

      mockUsersService.findAll.mockResolvedValue(expectedUsers);

      const result = await controller.findAll();

      expect(result).toEqual(expectedUsers);
    });
  });

  describe("findOne", () => {
    it("should return a user by id (dueño)", async () => {
      const expectedUser = {
        id: "uuid-123",
        name: "Test User",
        otpCode: "123456",
        pushToken: "ExponentPushToken[xxx]",
      };

      mockUsersService.findOne.mockResolvedValue(expectedUser);

      const result = await controller.findOne("uuid-123", {
        user: { id: "uuid-123", role: "buyer" },
      } as any);

      expect(result).toEqual({ id: "uuid-123", name: "Test User" });
      // Los datos sensibles jamás salen en la respuesta.
      expect((result as any).otpCode).toBeUndefined();
      expect((result as any).pushToken).toBeUndefined();
    });

    it("should forbid access to another user's data", async () => {
      await expect(
        controller.findOne("other-uuid", {
          user: { id: "uuid-123", role: "buyer" },
        } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.findOne).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update a user", async () => {
      const updateUserDto = { name: "Updated Name" };
      const expectedUser = {
        id: "uuid-123",
        name: "Updated Name",
      };

      mockUsersService.update.mockResolvedValue(expectedUser);

      const result = await controller.update("uuid-123", updateUserDto, {
        user: { id: "uuid-123", role: "buyer" },
      } as any);

      expect(result).toEqual(expectedUser);
    });
  });

  describe("remove", () => {
    it("should remove a user", async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove("uuid-123", {
        user: { id: "uuid-123", role: "buyer" },
      } as any);

      expect(mockUsersService.remove).toHaveBeenCalledWith("uuid-123");
    });

    it("should forbid deleting another user", async () => {
      await expect(
        controller.remove("other-uuid", {
          user: { id: "uuid-123", role: "buyer" },
        } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.remove).not.toHaveBeenCalled();
    });
  });
});

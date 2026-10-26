import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { FavoritesService } from "./favorites.service";
import { Favorite } from "./favorite.entity";
import { Product } from "../products/product.entity";

describe("FavoritesService", () => {
  let service: FavoritesService;

  const mockFavoriteRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockProductRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: getRepositoryToken(Favorite),
          useValue: mockFavoriteRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("toggle", () => {
    it("adds a favorite when it does not exist", async () => {
      mockProductRepository.findOne.mockResolvedValue({ id: "p1" });
      mockFavoriteRepository.findOne.mockResolvedValue(null);
      mockFavoriteRepository.create.mockImplementation((data) => data);
      mockFavoriteRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.toggle("u1", "p1");

      expect(result).toEqual({ favorited: true });
      expect(mockFavoriteRepository.save).toHaveBeenCalledWith({
        userId: "u1",
        productId: "p1",
      });
    });

    it("removes an existing favorite", async () => {
      const existing = { id: "f1", userId: "u1", productId: "p1" };
      mockProductRepository.findOne.mockResolvedValue({ id: "p1" });
      mockFavoriteRepository.findOne.mockResolvedValue(existing);
      mockFavoriteRepository.remove.mockResolvedValue(existing);

      const result = await service.toggle("u1", "p1");

      expect(result).toEqual({ favorited: false });
      expect(mockFavoriteRepository.remove).toHaveBeenCalledWith(existing);
    });

    it("throws when the product does not exist", async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.toggle("u1", "missing")).rejects.toThrow(
        NotFoundException,
      );
      expect(mockFavoriteRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("listProductIds", () => {
    it("returns the ids of the user's favorites", async () => {
      mockFavoriteRepository.find.mockResolvedValue([
        { productId: "p1" },
        { productId: "p2" },
      ]);

      const ids = await service.listProductIds("u1");

      expect(ids).toEqual(["p1", "p2"]);
      expect(mockFavoriteRepository.find).toHaveBeenCalledWith({
        where: { userId: "u1" },
      });
    });
  });

  describe("findUserIdsByProduct", () => {
    it("returns the users interested in a product", async () => {
      mockFavoriteRepository.find.mockResolvedValue([
        { userId: "u1" },
        { userId: "u2" },
      ]);

      const userIds = await service.findUserIdsByProduct("p1");

      expect(userIds).toEqual(["u1", "u2"]);
      expect(mockFavoriteRepository.find).toHaveBeenCalledWith({
        where: { productId: "p1" },
      });
    });
  });

  describe("findUserIdsBySellerProducts", () => {
    it("returns distinct users interested in any product of the seller", async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ userId: "u1" }, { userId: "u3" }]),
      };
      mockFavoriteRepository.createQueryBuilder.mockReturnValue(qb);

      const userIds = await service.findUserIdsBySellerProducts("seller-1");

      expect(userIds).toEqual(["u1", "u3"]);
      expect(qb.where).toHaveBeenCalledWith("product.sellerId = :sellerId", {
        sellerId: "seller-1",
      });
      expect(qb.andWhere).toHaveBeenCalledWith("favorite.userId != :sellerId", {
        sellerId: "seller-1",
      });
    });
  });
});

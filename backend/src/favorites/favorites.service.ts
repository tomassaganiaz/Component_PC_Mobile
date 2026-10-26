import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Favorite } from "./favorite.entity";
import { Product } from "../products/product.entity";

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /** Marca/desmarca un producto como de interés. Devuelve el nuevo estado. */
  async toggle(
    userId: string,
    productId: string,
  ): Promise<{ favorited: boolean }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException("Producto no encontrado");
    }

    const existing = await this.favoriteRepository.findOne({
      where: { userId, productId },
    });
    if (existing) {
      await this.favoriteRepository.remove(existing);
      return { favorited: false };
    }
    await this.favoriteRepository.save(
      this.favoriteRepository.create({ userId, productId }),
    );
    return { favorited: true };
  }

  /** IDs de productos marcados como de interés por el usuario. */
  async listProductIds(userId: string): Promise<string[]> {
    const rows = await this.favoriteRepository.find({ where: { userId } });
    return rows.map((f) => f.productId);
  }

  /** Usuarios interesados en un producto concreto (alertas de precio/stock). */
  async findUserIdsByProduct(productId: string): Promise<string[]> {
    const rows = await this.favoriteRepository.find({ where: { productId } });
    return rows.map((f) => f.userId);
  }

  /** Usuarios interesados en CUALQUIER producto de un vendedor (novedades). */
  async findUserIdsBySellerProducts(sellerId: string): Promise<string[]> {
    const rows = await this.favoriteRepository
      .createQueryBuilder("favorite")
      .innerJoin(Product, "product", "product.id = favorite.productId")
      .where("product.sellerId = :sellerId", { sellerId })
      .andWhere("favorite.userId != :sellerId", { sellerId })
      .select("DISTINCT favorite.userId", "userId")
      .getRawMany<{ userId: string }>();
    return rows.map((r) => r.userId);
  }
}

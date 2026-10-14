import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cart } from "./cart.entity";
import { CartItem } from "./cart-item.entity";
import { ProductsService } from "../products/products.service";
import { ProductStatus } from "../products/product.entity";

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly itemRepository: Repository<CartItem>,
    private readonly productsService: ProductsService,
  ) {}

  /** Devuelve el carrito del usuario (lo crea si no existe). */
  async getOrCreate(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ["items", "items.product"],
    });
    if (!cart) {
      cart = await this.cartRepository.save(
        this.cartRepository.create({ userId }),
      );
      cart.items = [];
    }
    return cart;
  }

  async getCart(userId: string): Promise<Cart> {
    return this.getOrCreate(userId);
  }

  async addItem(
    userId: string,
    productId: string,
    quantity = 1,
  ): Promise<Cart> {
    const product = await this.productsService.findOne(productId);
    if (product.status === ProductStatus.SOLD) {
      throw new BadRequestException("El producto no está disponible");
    }

    const cart = await this.getOrCreate(userId);
    const existing = cart.items.find((i) => i.productId === productId);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + quantity);
      await this.itemRepository.save(existing);
    } else {
      const item = this.itemRepository.create({
        cartId: cart.id,
        productId,
        quantity,
      });
      await this.itemRepository.save(item);
    }
    return this.getCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    quantity: number,
  ): Promise<Cart> {
    const cart = await this.getOrCreate(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException("Ítem del carrito no encontrado");
    }
    item.quantity = quantity;
    await this.itemRepository.save(item);
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<Cart> {
    const cart = await this.getOrCreate(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException("Ítem del carrito no encontrado");
    }
    await this.itemRepository.remove(item);
    return this.getCart(userId);
  }

  async clear(userId: string): Promise<void> {
    const cart = await this.cartRepository.findOne({ where: { userId } });
    if (cart) {
      await this.itemRepository.delete({ cartId: cart.id });
    }
  }
}

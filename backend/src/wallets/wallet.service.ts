import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Wallet } from "./wallet.entity";
import { WalletEntry, WalletEntryType } from "./wallet-entry.entity";
import { Payout, PayoutStatus } from "./payout.entity";

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletEntry)
    private readonly entryRepository: Repository<WalletEntry>,
    @InjectRepository(Payout)
    private readonly payoutRepository: Repository<Payout>,
  ) {}

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /** Asegura un monto positivo y finito antes de tocar la base de datos. */
  private assertAmount(amount: number): number {
    const amt = this.round(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new BadRequestException("Monto inválido");
    }
    return amt;
  }

  async getOrCreate(userId: string): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await this.walletRepository.save(
        this.walletRepository.create({ userId, balance: 0 }),
      );
    }
    return wallet;
  }

  async getWallet(
    userId: string,
  ): Promise<{ balance: number; entries: WalletEntry[]; payouts: Payout[] }> {
    const wallet = await this.getOrCreate(userId);
    const [entries, payouts] = await Promise.all([
      this.entryRepository.find({
        where: { walletId: wallet.id },
        order: { createdAt: "DESC" },
        take: 100,
      }),
      this.payoutRepository.find({
        where: { userId },
        order: { createdAt: "DESC" },
      }),
    ]);
    return { balance: Number(wallet.balance), entries, payouts };
  }

  private async addEntry(
    wallet: Wallet,
    type: WalletEntryType,
    amount: number,
    description: string,
    orderId?: string,
  ): Promise<void> {
    await this.entryRepository.save(
      this.entryRepository.create({
        walletId: wallet.id,
        type,
        amount,
        description,
        orderId: orderId ?? null,
      }),
    );
  }

  /**
   * El asiento (orden + tipo + descripción) ya existe? Evita aplicar dos veces
   * el mismo movimiento cuando la operación se reintenta o hay carreras.
   */
  private async findEntry(
    wallet: Wallet,
    type: WalletEntryType,
    orderId: string,
    description: string,
  ): Promise<WalletEntry | null> {
    return this.entryRepository.findOne({
      where: { walletId: wallet.id, orderId, type, description },
    });
  }

  /** Acredita saldo (ej: venta entregada). UPDATE atómico + idempotente. */
  async credit(
    userId: string,
    amount: number,
    description: string,
    orderId?: string,
  ): Promise<Wallet> {
    const amt = this.assertAmount(amount);
    const wallet = await this.getOrCreate(userId);

    if (orderId) {
      const existing = await this.findEntry(
        wallet,
        WalletEntryType.CREDIT,
        orderId,
        description,
      );
      if (existing) return wallet; // ya acreditado: no repetir
    }

    // balance + amt en una sola sentencia: dos créditos concurrentes no se pisan.
    await this.walletRepository
      .createQueryBuilder()
      .update(Wallet)
      .set({ balance: () => `balance + ${amt}` })
      .where("id = :id", { id: wallet.id })
      .execute();

    await this.addEntry(
      wallet,
      WalletEntryType.CREDIT,
      amt,
      description,
      orderId,
    );

    const fresh = await this.walletRepository.findOne({
      where: { id: wallet.id },
    });
    return fresh ?? wallet;
  }

  /**
   * Debita saldo. UPDATE condicional atómico:
   * - por defecto exige saldo suficiente (nunca deja la cuenta negativa);
   * - con clampToZero acepta débitos parciales (reembolsos: hoy ya no se roba
   *   saldo de otras ventas porque el débito a vendedores solo aplica a
   *   órdenes DELIVERED).
   */
  async debit(
    userId: string,
    amount: number,
    description: string,
    orderId?: string,
    opts?: { clampToZero?: boolean },
  ): Promise<Wallet> {
    const amt = this.assertAmount(amount);
    const wallet = await this.getOrCreate(userId);

    if (orderId) {
      const existing = await this.findEntry(
        wallet,
        WalletEntryType.DEBIT,
        orderId,
        description,
      );
      if (existing) return wallet; // ya debitado: no repetir
    }

    if (opts?.clampToZero) {
      await this.walletRepository
        .createQueryBuilder()
        .update(Wallet)
        .set({ balance: () => `GREATEST(balance - ${amt}, 0)` })
        .where("id = :id", { id: wallet.id })
        .execute();
    } else {
      const result = await this.walletRepository
        .createQueryBuilder()
        .update(Wallet)
        .set({ balance: () => `balance - ${amt}` })
        .where("id = :id AND balance >= :amt", { id: wallet.id, amt })
        .execute();
      if (!result.affected) {
        throw new BadRequestException("Saldo insuficiente");
      }
    }

    await this.addEntry(
      wallet,
      WalletEntryType.DEBIT,
      amt,
      description,
      orderId,
    );

    const fresh = await this.walletRepository.findOne({
      where: { id: wallet.id },
    });
    return fresh ?? wallet;
  }

  /** Solicita un retiro del saldo disponible (débito condicional atómico). */
  async requestPayout(userId: string, amount: number): Promise<Payout> {
    if (amount <= 0) {
      throw new BadRequestException("El monto debe ser mayor a 0");
    }
    const amt = this.round(Number(amount));
    const wallet = await this.getOrCreate(userId);

    // Dos retiros simultáneos por el saldo completo: solo uno puede pasar
    // el chequeo "balance >= amt" (antes: check-then-act → saldo negativo).
    const result = await this.walletRepository
      .createQueryBuilder()
      .update(Wallet)
      .set({ balance: () => `balance - ${amt}` })
      .where("id = :id AND balance >= :amt", { id: wallet.id, amt })
      .execute();
    if (!result.affected) {
      throw new BadRequestException("Saldo insuficiente");
    }

    try {
      const payout = await this.payoutRepository.save(
        this.payoutRepository.create({
          userId,
          amount: amt,
          status: PayoutStatus.PENDING,
        }),
      );
      await this.addEntry(
        wallet,
        WalletEntryType.PAYOUT,
        amt,
        "Solicitud de retiro",
      );
      return payout;
    } catch (err) {
      // Si el payout no se pudo crear, se revierte el débito.
      await this.walletRepository
        .createQueryBuilder()
        .update(Wallet)
        .set({ balance: () => `balance + ${amt}` })
        .where("id = :id", { id: wallet.id })
        .execute();
      throw err;
    }
  }
}

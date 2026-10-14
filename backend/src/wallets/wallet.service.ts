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

  /** Acredita saldo (ej: venta entregada). */
  async credit(
    userId: string,
    amount: number,
    description: string,
    orderId?: string,
  ): Promise<Wallet> {
    const wallet = await this.getOrCreate(userId);
    wallet.balance = this.round(Number(wallet.balance) + amount);
    await this.walletRepository.save(wallet);
    await this.addEntry(wallet, WalletEntryType.CREDIT, amount, description, orderId);
    return wallet;
  }

  /** Debita saldo (ej: reembolso al comprador). */
  async debit(
    userId: string,
    amount: number,
    description: string,
    orderId?: string,
  ): Promise<Wallet> {
    const wallet = await this.getOrCreate(userId);
    wallet.balance = this.round(Math.max(0, Number(wallet.balance) - amount));
    await this.walletRepository.save(wallet);
    await this.addEntry(wallet, WalletEntryType.DEBIT, amount, description, orderId);
    return wallet;
  }

  /** Solicita un retiro del saldo disponible. */
  async requestPayout(userId: string, amount: number): Promise<Payout> {
    if (amount <= 0) {
      throw new BadRequestException("El monto debe ser mayor a 0");
    }
    const wallet = await this.getOrCreate(userId);
    if (amount > Number(wallet.balance)) {
      throw new BadRequestException("Saldo insuficiente");
    }

    wallet.balance = this.round(Number(wallet.balance) - amount);
    await this.walletRepository.save(wallet);

    const payout = await this.payoutRepository.save(
      this.payoutRepository.create({
        userId,
        amount,
        status: PayoutStatus.PENDING,
      }),
    );
    await this.addEntry(
      wallet,
      WalletEntryType.PAYOUT,
      amount,
      "Solicitud de retiro",
    );
    return payout;
  }
}

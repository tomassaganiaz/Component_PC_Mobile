import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Wallet } from "./wallet.entity";
import { WalletEntry } from "./wallet-entry.entity";
import { Payout } from "./payout.entity";
import { WalletService } from "./wallet.service";
import { WalletController } from "./wallet.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletEntry, Payout])],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletsModule {}

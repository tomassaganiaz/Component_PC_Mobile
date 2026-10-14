import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MlCredential } from "./ml-credential.entity";
import { MercadoLibreService } from "./mercadolibre.service";
import { MercadoLibreController } from "./mercadolibre.controller";

@Module({
  imports: [TypeOrmModule.forFeature([MlCredential])],
  controllers: [MercadoLibreController],
  providers: [MercadoLibreService],
  exports: [MercadoLibreService],
})
export class MercadoLibreModule {}

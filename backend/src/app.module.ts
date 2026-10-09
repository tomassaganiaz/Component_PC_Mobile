import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { UsersModule } from "./users/users.module";
import { ProductsModule } from "./products/products.module";
import { OrdersModule } from "./orders/orders.module";
import { VerificationsModule } from "./verifications/verifications.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { AuthModule } from "./auth/auth.module";
import { ReportsModule } from "./reports/reports.module";
import { ChatModule } from "./chat/chat.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { MediaModule } from "./media/media.module";
import { ThrottlerUserGuard } from "./common/throttler-user.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get("THROTTLE_TTL", 60) * 1000,
            limit: configService.get("THROTTLE_LIMIT", 100),
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get("NODE_ENV", "development");
        const dbUrl = configService.get("DATABASE_URL");

        // Soporte para PostgreSQL en la nube (Neon/Supabase/Railway) vía URL con SSL
        if (dbUrl) {
          const u = new URL(dbUrl);
          return {
            type: "postgres",
            url: dbUrl,
            ssl:
              configService.get("DATABASE_SSL") === "true"
                ? { rejectUnauthorized: false }
                : false,
            entities: [__dirname + "/**/*.entity{.ts,.js}"],
            migrations: [__dirname + "/database/migrations/*{.ts,.js}"],
            synchronize: nodeEnv === "development",
            logging: nodeEnv === "development",
          };
        }

        return {
          type: "postgres",
          host: configService.get("DATABASE_HOST", "localhost"),
          port: configService.get<number>("DATABASE_PORT", 5432),
          username: configService.get("DATABASE_USER", "postgres"),
          password: configService.get("DATABASE_PASSWORD", "postgres"),
          database: configService.get("DATABASE_NAME", "ers_components"),
          entities: [__dirname + "/**/*.entity{.ts,.js}"],
          migrations: [__dirname + "/database/migrations/*{.ts,.js}"],
          synchronize: nodeEnv === "development",
          logging: nodeEnv === "development",
          ssl:
            nodeEnv === "production"
              ? { rejectUnauthorized: false }
              : configService.get("DATABASE_SSL") === "true"
                ? { rejectUnauthorized: false }
                : false,
        };
      },
    }),
    UsersModule,
    ProductsModule,
    OrdersModule,
    VerificationsModule,
    ReviewsModule,
    AuthModule,
    ReportsModule,
    ChatModule,
    AnalyticsModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerUserGuard,
    },
  ],
})
export class AppModule {}

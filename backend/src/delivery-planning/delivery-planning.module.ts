import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { DeliveryRoute, RouteStop } from "./delivery-route.entity";
import { DeliveryPlanningService } from "./delivery-planning.service";
import { DeliveryPlanningController } from "./delivery-planning.controller";
import { DriverAppService } from "./driver-app.service";
import { DriverAppController } from "./driver-app.controller";
import { DeliveryNotificationsService } from "./delivery-notifications.service";
import { Order } from "../orders/order.entity";
import { User } from "../users/user.entity";
import { GoogleMapsModule } from "../googlemaps/googlemaps.module";
import { Notification } from "../notifications/notification.entity";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryRoute,
      RouteStop,
      Order,
      User,
      Notification,
    ]),
    ScheduleModule.forRoot(),
    GoogleMapsModule,
    NotificationsModule,
  ],
  controllers: [DeliveryPlanningController, DriverAppController],
  providers: [
    DeliveryPlanningService,
    DriverAppService,
    DeliveryNotificationsService,
  ],
  exports: [
    DeliveryPlanningService,
    DriverAppService,
    DeliveryNotificationsService,
  ],
})
export class DeliveryPlanningModule {}

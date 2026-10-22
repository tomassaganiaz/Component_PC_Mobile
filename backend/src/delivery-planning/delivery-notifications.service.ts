import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";
import twilio from "twilio";
import {
  Notification,
  NotificationChannel,
  NotificationType,
} from "../notifications/notification.entity";
import { User } from "../users/user.entity";
import { DeliveryRoute } from "./delivery-route.entity";
import { RouteStop } from "./delivery-route.entity";

export interface TrackingLinkData {
  routeId: string;
  stopId: string;
  orderId: string;
  trackingUrl: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  nextAttemptDate?: string;
  carrierName: string;
  driverName?: string;
  vehiclePlate?: string;
  failureReason?: string;
  etaMinutes?: number;
}

@Injectable()
export class DeliveryNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(DeliveryNotificationsService.name);
  private readonly baseUrl: string;

  private firebaseApp: any = null;
  private sendGridClient: sgMail.MailService | null = null;
  private twilioClient: any = null;

  private pushEnabled: boolean;
  private emailEnabled: boolean;
  private smsEnabled: boolean;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get("APP_FRONTEND_URL", "http://localhost:3000");

    this.pushEnabled = Boolean(
      this.config.get("FIREBASE_SERVICE_ACCOUNT_KEY") ||
      this.config.get("FIREBASE_PROJECT_ID"),
    );
    this.emailEnabled = Boolean(this.config.get("SENDGRID_API_KEY"));
    this.smsEnabled = Boolean(
      this.config.get("TWILIO_ACCOUNT_SID") &&
      this.config.get("TWILIO_AUTH_TOKEN"),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.initializeFirebase();
    this.initializeSendGrid();
    this.initializeTwilio();
  }

  private async initializeFirebase(): Promise<void> {
    if (!this.pushEnabled) {
      this.logger.warn(
        "Push notifications disabled: FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID not set",
      );
      return;
    }

    try {
      const serviceAccountKey = this.config.get("FIREBASE_SERVICE_ACCOUNT_KEY");
      const projectId = this.config.get("FIREBASE_PROJECT_ID");

      if (serviceAccountKey) {
        const serviceAccount =
          typeof serviceAccountKey === "string"
            ? JSON.parse(serviceAccountKey)
            : serviceAccountKey;
        this.firebaseApp = admin.initializeApp({
          credential: (admin as any).credential.cert(serviceAccount),
          projectId,
        });
      } else if (projectId) {
        this.firebaseApp = admin.initializeApp({ projectId });
      }

      if (this.firebaseApp) {
        this.logger.log(
          "Firebase Admin SDK initialized for push notifications",
        );
      }
    } catch (err) {
      this.logger.error(`Failed to initialize Firebase: ${String(err)}`);
      this.pushEnabled = false;
    }
  }

  private initializeSendGrid(): void {
    if (!this.emailEnabled) {
      this.logger.warn(
        "Email notifications disabled: SENDGRID_API_KEY not set",
      );
      return;
    }

    try {
      sgMail.setApiKey(this.config.get("SENDGRID_API_KEY")!);
      this.sendGridClient = sgMail;
      this.logger.log("SendGrid initialized for email notifications");
    } catch (err) {
      this.logger.error(`Failed to initialize SendGrid: ${String(err)}`);
      this.emailEnabled = false;
    }
  }

  private initializeTwilio(): void {
    if (!this.smsEnabled) {
      this.logger.warn(
        "SMS notifications disabled: TWILIO credentials not set",
      );
      return;
    }

    try {
      const accountSid = this.config.get("TWILIO_ACCOUNT_SID")!;
      const authToken = this.config.get("TWILIO_AUTH_TOKEN")!;
      this.twilioClient = twilio(accountSid, authToken);
      this.logger.log("Twilio initialized for SMS notifications");
    } catch (err) {
      this.logger.error(`Failed to initialize Twilio: ${String(err)}`);
      this.smsEnabled = false;
    }
  }

  generateTrackingUrl(stop: RouteStop, route: DeliveryRoute): string {
    const params = new URLSearchParams({
      routeId: route.id,
      stopId: stop.id,
      orderId: stop.orderId,
    });
    return `${this.baseUrl}/tracking?${params.toString()}`;
  }

  async notifyRouteAssigned(
    route: DeliveryRoute,
    stop: RouteStop,
  ): Promise<void> {
    const buyer = await this.userRepository.findOne({
      where: { id: stop.orderId },
    });
    if (!buyer) {
      this.logger.warn(`No se encontró comprador para orden ${stop.orderId}`);
      return;
    }

    const trackingUrl = this.generateTrackingUrl(stop, route);
    const estimatedDate = new Date(route.deliveryDate);
    estimatedDate.setDate(
      estimatedDate.getDate() + (stop.sequence > 5 ? 1 : 0),
    );

    await this.sendMultiChannel(buyer, {
      type: NotificationType.DELIVERY_ASSIGNED,
      title: `📦 Tu pedido está en ruta - ${route.carrierName}`,
      body: `Tu compra será entregada el ${estimatedDate.toLocaleDateString("es-AR")} por ${route.driverName || "un repartidor"}${route.vehiclePlate ? ` (${route.vehiclePlate})` : ""}.`,
      data: {
        routeId: route.id,
        stopId: stop.id,
        orderId: stop.orderId,
        trackingUrl,
        estimatedDelivery: estimatedDate.toISOString(),
        carrierName: route.carrierName,
        driverName: route.driverName,
        vehiclePlate: route.vehiclePlate,
      } as TrackingLinkData,
      channels: [
        NotificationChannel.PUSH,
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ],
    });
  }

  async notifyRouteStarted(
    route: DeliveryRoute,
    stops: RouteStop[],
  ): Promise<void> {
    for (const stop of stops) {
      const buyer = await this.userRepository.findOne({
        where: { id: stop.orderId },
      });
      if (!buyer) continue;

      const trackingUrl = this.generateTrackingUrl(stop, route);

      await this.sendMultiChannel(buyer, {
        type: NotificationType.DELIVERY_STARTED,
        title: `🚚 Tu pedido salió a reparto`,
        body: `El repartidor ${route.driverName || "de " + route.carrierName} ya está en camino. Parada #${stop.sequence} de ${route.ordersCount}.`,
        data: {
          routeId: route.id,
          stopId: stop.id,
          orderId: stop.orderId,
          trackingUrl,
          estimatedDelivery: route.deliveryDate.toISOString(),
          carrierName: route.carrierName,
          driverName: route.driverName,
          vehiclePlate: route.vehiclePlate,
        } as TrackingLinkData,
        channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      });
    }
  }

  async notifyDriverApproaching(
    stop: RouteStop,
    route: DeliveryRoute,
    etaMinutes: number,
  ): Promise<void> {
    const buyer = await this.userRepository.findOne({
      where: { id: stop.orderId },
    });
    if (!buyer) return;

    const trackingUrl = this.generateTrackingUrl(stop, route);

    await this.sendMultiChannel(buyer, {
      type: NotificationType.DELIVERY_APPROACHING,
      title: `📍 El repartidor está cerca`,
      body: `Llegará en aproximadamente ${etaMinutes} minutos. Tené a mano tu documento.`,
      data: {
        routeId: route.id,
        stopId: stop.id,
        orderId: stop.orderId,
        trackingUrl,
        estimatedDelivery: route.deliveryDate.toISOString(),
        carrierName: route.carrierName,
        driverName: route.driverName,
        vehiclePlate: route.vehiclePlate,
        etaMinutes,
      } as TrackingLinkData,
      channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
    });
  }

  async notifyDelivered(stop: RouteStop, route: DeliveryRoute): Promise<void> {
    const buyer = await this.userRepository.findOne({
      where: { id: stop.orderId },
    });
    if (!buyer) return;

    const trackingUrl = this.generateTrackingUrl(stop, route);

    await this.sendMultiChannel(buyer, {
      type: NotificationType.DELIVERY_COMPLETED,
      title: `✅ Pedido entregado`,
      body: `Tu compra fue entregada correctamente. ¡Disfrutala! Si tenés algún problema, respondé a este mensaje.`,
      data: {
        routeId: route.id,
        stopId: stop.id,
        orderId: stop.orderId,
        trackingUrl,
        deliveredAt: new Date().toISOString(),
        carrierName: route.carrierName,
      } as TrackingLinkData,
      channels: [
        NotificationChannel.PUSH,
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ],
    });
  }

  async notifyDeliveryFailed(
    stop: RouteStop,
    route: DeliveryRoute,
    reason: string,
  ): Promise<void> {
    const buyer = await this.userRepository.findOne({
      where: { id: stop.orderId },
    });
    if (!buyer) return;

    const trackingUrl = this.generateTrackingUrl(stop, route);
    const nextAttempt = new Date();
    nextAttempt.setDate(nextAttempt.getDate() + 1);

    await this.sendMultiChannel(buyer, {
      type: NotificationType.DELIVERY_FAILED,
      title: `⚠️ No se pudo entregar tu pedido`,
      body: `Motivo: ${reason}. Reintentaremos mañana ${nextAttempt.toLocaleDateString("es-AR")}. Si necesitás cambiar la dirección, contactanos.`,
      data: {
        routeId: route.id,
        stopId: stop.id,
        orderId: stop.orderId,
        trackingUrl,
        nextAttemptDate: nextAttempt.toISOString(),
        failureReason: reason,
        carrierName: route.carrierName,
      } as TrackingLinkData,
      channels: [
        NotificationChannel.PUSH,
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
        NotificationChannel.SMS,
      ],
    });
  }

  private async sendMultiChannel(
    user: User,
    payload: {
      type: NotificationType;
      title: string;
      body: string;
      data: TrackingLinkData;
      channels: NotificationChannel[];
    },
  ): Promise<void> {
    const results = await Promise.allSettled(
      payload.channels.map((channel) =>
        this.sendSingleChannel(user, channel, payload),
      ),
    );

    const notification = this.notificationRepository.create({
      userId: user.id,
      type: payload.type,
      channel: NotificationChannel.IN_APP,
      title: payload.title,
      body: payload.body,
      metadata: payload.data as any,
    });
    await this.notificationRepository.save(notification);

    results.forEach((result, idx) => {
      const channel = payload.channels[idx];
      if (result.status === "fulfilled") {
        this.logger.log(`${channel} notification sent to user ${user.id}`);
      } else {
        this.logger.error(
          `${channel} notification failed for user ${user.id}: ${result.reason}`,
        );
      }
    });
  }

  private async sendSingleChannel(
    user: User,
    channel: NotificationChannel,
    payload: {
      type: NotificationType;
      title: string;
      body: string;
      data: TrackingLinkData;
    },
  ): Promise<void> {
    switch (channel) {
      case NotificationChannel.PUSH:
        await this.sendPush(user, payload);
        break;
      case NotificationChannel.EMAIL:
        await this.sendEmail(user, payload);
        break;
      case NotificationChannel.SMS:
        await this.sendSms(user, payload);
        break;
      case NotificationChannel.IN_APP:
        break;
      default:
        this.logger.warn(`Unknown notification channel: ${channel}`);
    }
  }

  private async sendPush(
    user: User,
    payload: { title: string; body: string; data: TrackingLinkData },
  ): Promise<void> {
    if (!this.pushEnabled || !this.firebaseApp) {
      this.logger.debug(`Push disabled, skipping for user ${user.id}`);
      return;
    }

    if (!user.pushToken) {
      this.logger.debug(`User ${user.id} has no push token`);
      return;
    }

    try {
      const message: any = {
        token: user.pushToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          ...Object.fromEntries(
            Object.entries(payload.data).map(([k, v]) => [k, String(v)]),
          ),
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        android: {
          priority: "high",
          notification: {
            channelId: "delivery_notifications",
            icon: "ic_notification",
            color: "#00a884",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              category: "DELIVERY",
            },
          },
        },
      };

      await this.firebaseApp.messaging().send(message);
      this.logger.log(`Push sent to user ${user.id}`);
    } catch (err) {
      const error = err as any;
      if (
        error.code === "messaging/registration-token-not-registered" ||
        error.code === "messaging/invalid-registration-token"
      ) {
        this.logger.warn(`Invalid push token for user ${user.id}, clearing`);
        user.pushToken = "";
        await this.userRepository.save(user);
      }
      throw err;
    }
  }

  private async sendEmail(
    user: User,
    payload: { title: string; body: string; data: TrackingLinkData },
  ): Promise<void> {
    if (!this.emailEnabled || !this.sendGridClient) {
      this.logger.debug(`Email disabled, skipping for user ${user.id}`);
      return;
    }

    if (!user.email) {
      this.logger.debug(`User ${user.id} has no email`);
      return;
    }

    try {
      const html = this.renderEmailTemplate(
        payload.title,
        payload.body,
        payload.data.trackingUrl,
      );

      await this.sendGridClient!.send({
        to: user.email,
        from: {
          email: this.config.get(
            "SENDGRID_FROM_EMAIL",
            "noreply@techshield.com",
          ),
          name: this.config.get("SENDGRID_FROM_NAME", "TechShield"),
        },
        subject: payload.title,
        html,
        categories: ["delivery", payload.data.routeId],
        customArgs: {
          routeId: payload.data.routeId,
          stopId: payload.data.stopId,
          orderId: payload.data.orderId,
        },
      });
      this.logger.log(`Email sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Email failed for ${user.email}: ${String(err)}`);
      throw err;
    }
  }

  private async sendSms(
    user: User,
    payload: { title: string; body: string; data: TrackingLinkData },
  ): Promise<void> {
    if (!this.smsEnabled || !this.twilioClient) {
      this.logger.debug(`SMS disabled, skipping for user ${user.id}`);
      return;
    }

    if (!user.phone) {
      this.logger.debug(`User ${user.id} has no phone number`);
      return;
    }

    try {
      const fromNumber = this.config.get("TWILIO_FROM_NUMBER")!;
      const message = `${payload.title}\n\n${payload.body}\n\nSeguimiento: ${payload.data.trackingUrl}`;

      await this.twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: user.phone.startsWith("+") ? user.phone : `+54${user.phone}`,
      });
      this.logger.log(`SMS sent to ${user.phone}`);
    } catch (err) {
      this.logger.error(`SMS failed for ${user.phone}: ${String(err)}`);
      throw err;
    }
  }

  private renderEmailTemplate(
    title: string,
    body: string,
    trackingUrl: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #00a884 0%, #008f72 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">${body}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${trackingUrl}" style="background: #00a884; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
        📍 Ver tracking en tiempo real
      </a>
    </div>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="font-size: 12px; color: #888; text-align: center;">
      TechShield - Tu marketplace de componentes PC confiable<br>
      Si no solicitaste esta notificación, por favor ignorala.
    </p>
  </div>
</body>
</html>
    `.trim();
  }
}

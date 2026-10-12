import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification, NotificationType } from "./notification.entity";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  /** Crea una notificación para un usuario. */
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<Notification> {
    const notification = this.repository.create({
      userId,
      type,
      title,
      body,
      metadata: metadata ?? null,
    });
    return this.repository.save(notification);
  }

  /** Últimas notificaciones del usuario. */
  async findAll(userId: string): Promise<Notification[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: 100,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repository.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.repository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException("Notificación no encontrada");
    }
    notification.read = true;
    return this.repository.save(notification);
  }

  async markAllRead(userId: string): Promise<{ success: boolean }> {
    await this.repository.update({ userId, read: false }, { read: true });
    return { success: true };
  }
}

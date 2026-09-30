import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from './analytics.entity';
import { CreateAnalyticsEventDto } from './dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly eventRepository: Repository<AnalyticsEvent>,
  ) {}

  create(dto: CreateAnalyticsEventDto, userId?: string): Promise<AnalyticsEvent> {
    const event = this.eventRepository.create({ ...dto, userId });
    return this.eventRepository.save(event);
  }

  findRecent(limit = 100): Promise<AnalyticsEvent[]> {
    return this.eventRepository.find({
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 500),
    });
  }
}
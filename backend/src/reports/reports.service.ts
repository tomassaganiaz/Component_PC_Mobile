import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus } from './report.entity';
import { CreateReportDto, UpdateReportStatusDto, FilterReportDto } from './dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly usersService: UsersService,
  ) {}

  async create(createReportDto: CreateReportDto, reporterId: string): Promise<Report> {
    if (createReportDto.reportedId === reporterId) {
      throw new BadRequestException('No podés reportarte a vos mismo');
    }

    await this.usersService.findOne(createReportDto.reportedId);

    const report = this.reportRepository.create({
      ...createReportDto,
      reporterId,
      status: ReportStatus.PENDING,
    });
    return this.reportRepository.save(report);
  }

  async findAll(filters?: FilterReportDto): Promise<{ data: Report[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const query = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.reported', 'reported');

    if (filters?.status) {
      query.andWhere('report.status = :status', { status: filters.status });
    }

    const [data, total] = await query
      .orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['reporter', 'reported'],
    });
    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }
    return report;
  }

  async updateStatus(
    id: string,
    updateDto: UpdateReportStatusDto,
    resolvedBy: string,
  ): Promise<Report> {
    const report = await this.findOne(id);
    report.status = updateDto.status;
    report.resolutionNotes = updateDto.resolutionNotes ?? '';
    report.resolvedBy = resolvedBy;
    return this.reportRepository.save(report);
  }
}
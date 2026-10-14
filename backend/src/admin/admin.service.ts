import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/user.entity";
import { Product } from "../products/product.entity";
import { Order, OrderStatus } from "../orders/order.entity";
import { Review, ReviewType, ReviewStatus } from "../reviews/review.entity";
import { Report, ReportStatus } from "../reports/report.entity";

export interface AdminOverview {
  users: number;
  products: number;
  orders: number;
  deliveredOrders: number;
  revenue: number;
  pendingComplaints: number;
  openReports: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async overview(): Promise<AdminOverview> {
    const [users, products, orders, pendingComplaints, openReports, delivered] =
      await Promise.all([
        this.userRepository.count(),
        this.productRepository.count(),
        this.orderRepository.count(),
        this.reviewRepository.count({
          where: {
            type: ReviewType.COMPLAINT,
            status: ReviewStatus.PENDING,
          },
        }),
        this.reportRepository.count({
          where: { status: ReportStatus.PENDING },
        }),
        this.orderRepository.find({
          where: { status: OrderStatus.DELIVERED },
          select: ["id", "total"],
        }),
      ]);

    const revenue = delivered.reduce((sum, o) => sum + Number(o.total), 0);

    return {
      users,
      products,
      orders,
      deliveredOrders: delivered.length,
      revenue: Math.round(revenue * 100) / 100,
      pendingComplaints,
      openReports,
    };
  }
}

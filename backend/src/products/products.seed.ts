import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DeepPartial } from "typeorm";
import * as fs from "fs";
import { join } from "path";
import { User, UserRole } from "../users/user.entity";
import {
  Product,
  ProductCondition,
  ProductCategory,
  ProductStatus,
} from "./product.entity";
import { Order, OrderStatus } from "../orders/order.entity";
import { Review, ReviewType, ReviewStatus } from "../reviews/review.entity";
import * as bcrypt from "bcrypt";

const IMAGES = {
  ryzen:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBiaJytSsqqyWzFaV1XrH1e11G2FyTqXzI9-UPyXhT2EJIMCWUkjjpPATeV-WeJ1EIXR7UsXfnZCurVrE2rSf2iGAjsVoFZG_akWwijR9PkyqJMX6gExUW-C7xtzu2E3ayIzvljOHNmXozGwvWDqKY394EFVUqTBRp4vMc6KzCNCmadi9_IEHRL_8tIeg35_rhADfH86-dTdkz-BRfQkosfNM_6cvESB8G-k9IuFF2exmrApJPixgg",
  galaxy:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuB0s9foVZMYYd_VbKxSmewZVF77gUODCrlUWSkRUdLuOgzPOtROaJk3jchNcxBomyWQfDYtAB-K8yYLgJ3ZxyTFVmT3BCuD1b9rLs3eq6iEiwBtyX7RYalRJWfpc3XTnJcRellC8kKHN3xTERXyNzgQhUtopVLXQ0Q43NLuiQP-jM0hl-YatAKqwEb1WgvZPgyYqeWNIdnkbAyvPV25iZYJVl48YyKfObDrhwKHtOALHwCZPPcua_o",
  rtx: "https://lh3.googleusercontent.com/aida-public/AB6AXuB-UftjvauRRlC_2m1rzSqx28dlp7pgqVaUDgHVLh-XdxEFhF0JBDSrhdqBuTJmFmQ-S1TB4rJY7CeUPnsX1Bi7WYt33pRnvMRmRaHwxxAOXkKCJwMfe34c2soAmJpgdYllWEGDJuNA-vqMdycFcLBywcjFr0oOYclMy4loLeDsqa-DNyxizsD0HOXGfrRVgjrBiKbfIrGVecfchCKjk4IM28SGr2NiYuaXMvMiDmfSpkxM4EhsoQg",
  intel:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuB9MM1vzTy0XpgyZOcNL97t87rg90jgH5QR8mVFHOr9Gd4Tw6dI8ikyVj6-p7er1_2mEt0Jm22Chpfn32QtTgqF66RWMvw2i7aTvGbHKWWFJeimhCHjQlYg4gwa1bEZmpMPv0g2CATtHRNQmEH2vJkbf16FIoNNL95AJJhQtT7giEiTdor4yuFa4AxfBvAwUjShuGosksCZ1GSglJ4EukaqOuPQidGthxGE9n1lc86FNEMn0rzw0bM",
};

// Imágenes locales servidas por el backend en /static/products/<archivo>.
// El frontend resuelve la ruta relativa contra la base de la API.
const PRODUCT_IMAGES: Record<string, string> = {
  "AMD Ryzen 7 7800X3D": "/static/products/ryzen7-7800x3d.webp",
  "AMD Ryzen 9 7950X Sellado": "/static/products/ryzen9-7950x.webp",
  "AMD Ryzen 5 7600X verificado": "/static/products/ryzen5-7600x.webp",
  "Ryzen 5 5600X": "/static/products/ryzen5-7600x.webp",
  "Intel Core i5-14600K": "/static/products/intel-i5-14600k.webp",
  "Intel Core i5-14600K Sellado": "/static/products/intel-i5-14600k.webp",
  "Intel Core i5-13600K": "/static/products/intel-i5-14600k.webp",
  "RTX 3070 Ti Founder Edition": "/static/products/rtx-3070ti.webp",
  "RTX 3060 12GB": "/static/products/rtx-3060.webp",
  "NVIDIA RTX 4060 OC Nueva": "/static/products/rtx-4060.webp",
  "NVIDIA RTX 4070 Super verificada": "/static/products/rtx-4070-super.webp",
  "RTX 4090 sin factura": "/static/products/rtx-4090.webp",
  "Samsung Galaxy S23 Ultra": "/static/products/galaxy-s23-ultra.webp",
  "Samsung Galaxy S24 Ultra Sellado": "/static/products/galaxy-s24-ultra.webp",
  "Samsung Galaxy S21": "/static/products/galaxy-s21.webp",
  "Samsung Galaxy S21 128GB": "/static/products/galaxy-s21.webp",
  "iPhone 13 con detalles en pantalla": "/static/products/iphone13.webp",
  "Kingston Fury Beast 16GB DDR4 3200MHz":
    "/static/products/kingston-fury-ddr4.webp",
  "DDR5 Corsair 32GB 6000MHz": "/static/products/ddr5-corsair.webp",
  "MacBook Air M3 13 Sellada": "/static/products/macbook-air-m3.webp",
  "Notebook Gamer Lenovo Legion 5": "/static/products/notebook-legion-5.webp",
};

interface SeedSeller {
  email: string;
  name: string;
  acceptsTesting: boolean;
}const SELLERS: SeedSeller[] = [
  { email: "techlab.pro@test.com", name: "TechLab Pro", acceptsTesting: true },
  { email: "cybermundo@test.com", name: "CyberMundo", acceptsTesting: true },
  {
    email: "ventarapida@test.com",
    name: "Venta Rápida",
    acceptsTesting: false,
  },
];

@Injectable()
export class ProductsSeed implements OnModuleInit {
  private readonly logger = new Logger(ProductsSeed.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async onModuleInit() {
    await this.ensureNewProducts();
    await this.ensureProductImages();
    await this.ensureKycAndOtp();
    await this.ensureOpenComplaint();

    const exists = await this.userRepository.findOne({
      where: { email: SELLERS[0].email },
    });
    if (exists) {
      this.logger.log(
        "Datos demo de productos ya existentes, se omite el seed",
      );
      return;
    }

    const hash = await bcrypt.hash("demo12345", 10);

    const sellerA = await this.userRepository.save(
      this.userRepository.create({
        name: SELLERS[0].name,
        email: SELLERS[0].email,
        password: hash,
        role: UserRole.SELLER,
        acceptsTesting: true,
      }),
    );
    const sellerB = await this.userRepository.save(
      this.userRepository.create({
        name: SELLERS[1].name,
        email: SELLERS[1].email,
        password: hash,
        role: UserRole.SELLER,
        acceptsTesting: true,
      }),
    );
    const sellerC = await this.userRepository.save(
      this.userRepository.create({
        name: SELLERS[2].name,
        email: SELLERS[2].email,
        password: hash,
        role: UserRole.SELLER,
        acceptsTesting: false,
      }),
    );

    const buyers = [];
    for (let i = 1; i <= 3; i++) {
      buyers.push(
        await this.userRepository.save(
          this.userRepository.create({
            name: `Comprador Demo ${i}`,
            email: `buyer${i}@test.com`,
            password: hash,
            role: UserRole.BUYER,
            acceptsTesting: true,
          }),
        ),
      );
    }

    const createdAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

    const productSpecs: Array<{
      seller: User;
      title: string;
      desc: string;
      price: number;
      category: ProductCategory;
      image: string;
      verified: boolean;
      sealed?: boolean;
      condition?: ProductCondition;
      hoursOfUse: number;
      reportedHoursOfUse: number;
      usageType: string;
      stressTest: string;
      conditionGrade: string;
    }> = [
      {
        seller: sellerA,
        title: "AMD Ryzen 7 7800X3D",
        desc: "Procesador verificado con inspección de pines y V-Cache.",
        price: 340,
        category: ProductCategory.CPU,
        image: IMAGES.ryzen,
        verified: true,
        hoursOfUse: 320,
        reportedHoursOfUse: 350,
        usageType: "Gaming",
        stressTest: "Cinebench R23 30 min · pico 67°C · sin thermal throttle",
        conditionGrade: "A+",
      },
      {
        seller: sellerA,
        title: "Samsung Galaxy S23 Ultra",
        desc: "256GB · Phantom Black · libre de fábrica · S-Pen.",
        price: 649,
        category: ProductCategory.PHONE,
        image: IMAGES.galaxy,
        verified: true,
        hoursOfUse: 0,
        reportedHoursOfUse: 0,
        usageType: "Uso personal",
        stressTest: "Batería 97% · panel AMOLED sin burn-in · 42/42 tests",
        conditionGrade: "A+",
      },
      {
        seller: sellerA,
        title: "Intel Core i5-13600K",
        desc: "14 núcleos · LGA1700 · 5.1GHz turbo.",
        price: 265,
        category: ProductCategory.CPU,
        image: IMAGES.intel,
        verified: false,
        hoursOfUse: 0,
        reportedHoursOfUse: 100,
        usageType: "Oficina",
        stressTest: "",
        conditionGrade: "",
      },
      {
        seller: sellerB,
        title: "RTX 3070 Ti Founder Edition",
        desc: "Furmark benchmark · pasta térmica Kryonaut.",
        price: 380,
        category: ProductCategory.GPU,
        image: IMAGES.rtx,
        verified: true,
        hoursOfUse: 540,
        reportedHoursOfUse: 500,
        usageType: "Gaming",
        stressTest: "Furmark 45 min · pico 68°C · hot spot delta 11.4°C",
        conditionGrade: "A",
      },
      {
        seller: sellerB,
        title: "SSD Samsung 990 Pro 2TB",
        desc: "NVMe M.2 · 7450 MB/s lectura.",
        price: 180,
        category: ProductCategory.STORAGE,
        image: "",
        verified: true,
        hoursOfUse: 900,
        reportedHoursOfUse: 800,
        usageType: "Edición de video",
        stressTest: "CrystalDiskMark · 100% salud SMART",
        conditionGrade: "A",
      },
      {
        seller: sellerB,
        title: "Ryzen 5 5600X",
        desc: "6 núcleos · AM4 · sin Wraith Stealth.",
        price: 150,
        category: ProductCategory.CPU,
        image: IMAGES.ryzen,
        verified: false,
        hoursOfUse: 0,
        reportedHoursOfUse: 200,
        usageType: "Gaming",
        stressTest: "",
        conditionGrade: "",
      },
      {
        seller: sellerC,
        title: "RTX 3060 12GB",
        desc: "Baja minería según declaración del vendedor.",
        price: 220,
        category: ProductCategory.GPU,
        image: IMAGES.rtx,
        verified: true,
        hoursOfUse: 2100,
        reportedHoursOfUse: 300,
        usageType: "Minería",
        stressTest: "Furmark 30 min · pico 74°C · memoria estable",
        conditionGrade: "B+",
      },
      {
        seller: sellerC,
        title: "Samsung Galaxy S21",
        desc: "Color Phantom Violet · 128GB.",
        price: 210,
        category: ProductCategory.PHONE,
        image: IMAGES.galaxy,
        verified: false,
        hoursOfUse: 0,
        reportedHoursOfUse: 400,
        usageType: "Desconocido",
        stressTest: "",
        conditionGrade: "",
      },
      {
        seller: sellerC,
        title: "Motherboard B550 Aorus Pro",
        desc: "Socket AM4 · sin accesorios originales.",
        price: 95,
        category: ProductCategory.MOTHERBOARD,
        image: "",
        verified: false,
        hoursOfUse: 0,
        reportedHoursOfUse: 600,
        usageType: "Minería",
        stressTest: "",
        conditionGrade: "",
      },
      {
        seller: sellerA,
        title: "Intel Core i5-14600K Sellado",
        desc: "Nuevo · 14 núcleos · LGA1700 · sin abrir, con sello de fábrica.",
        price: 320,
        category: ProductCategory.CPU,
        image: IMAGES.intel,
        verified: true,
        sealed: true,
        condition: ProductCondition.NEW,
        hoursOfUse: 0,
        reportedHoursOfUse: 0,
        usageType: "Nuevo · sin uso",
        stressTest: "Verificación de sello y holograma · sin abrir",
        conditionGrade: "",
      },
      {
        seller: sellerB,
        title: "NVIDIA RTX 4060 OC Nueva",
        desc: "Nueva · sellada · garantía de fábrica intacta.",
        price: 330,
        category: ProductCategory.GPU,
        image: IMAGES.rtx,
        verified: true,
        sealed: true,
        condition: ProductCondition.NEW,
        hoursOfUse: 0,
        reportedHoursOfUse: 0,
        usageType: "Nuevo · sin uso",
        stressTest: "Sello intacto · sin encendido previo",
        conditionGrade: "",
      },
    ];

    const products: Product[] = [];
    for (const spec of productSpecs) {
      const data: DeepPartial<Product> = {
        title: spec.title,
        description: spec.desc,
        price: spec.price,
        condition: spec.condition ?? ProductCondition.USED,
        category: spec.category,
        status: ProductStatus.PUBLISHED,
        images: spec.image ? [spec.image] : [],
        verified: spec.verified,
        sealed: spec.sealed ?? false,
        hoursOfUse: spec.hoursOfUse || undefined,
        reportedHoursOfUse: spec.reportedHoursOfUse,
        usageType: spec.usageType,
        stressTest: spec.stressTest || undefined,
        conditionGrade: spec.conditionGrade || undefined,
        physicalState: "Verificado por laboratorio TechShield",
        sellerId: spec.seller.id,
        createdAt,
      };
      products.push(
        await this.productRepository.save(this.productRepository.create(data)),
      );
    }

    // Reviews (positividad): TechLab 100%, CyberMundo 66%, VentaRápida 33% + no acepta testeos
    const reviewPlan: Array<{
      productIndex: number;
      buyerIndex: number;
      type: ReviewType;
      rating: number;
    }> = [
      { productIndex: 0, buyerIndex: 0, type: ReviewType.POSITIVE, rating: 5 },
      { productIndex: 1, buyerIndex: 1, type: ReviewType.POSITIVE, rating: 5 },
      { productIndex: 2, buyerIndex: 2, type: ReviewType.POSITIVE, rating: 4 },
      { productIndex: 3, buyerIndex: 0, type: ReviewType.POSITIVE, rating: 5 },
      { productIndex: 4, buyerIndex: 1, type: ReviewType.POSITIVE, rating: 5 },
      { productIndex: 5, buyerIndex: 2, type: ReviewType.NEUTRAL, rating: 3 },
      { productIndex: 6, buyerIndex: 0, type: ReviewType.POSITIVE, rating: 4 },
      { productIndex: 7, buyerIndex: 1, type: ReviewType.COMPLAINT, rating: 1 },
      { productIndex: 8, buyerIndex: 2, type: ReviewType.COMPLAINT, rating: 1 },
    ];

    for (const plan of reviewPlan) {
      const product = products[plan.productIndex];
      const buyer = buyers[plan.buyerIndex];
      const order = await this.orderRepository.save(
        this.orderRepository.create({
          productId: product.id,
          buyerId: buyer.id,
          total: product.price,
          status: OrderStatus.DELIVERED,
          custodyStartDate: createdAt,
          createdAt,
        }),
      );
      await this.reviewRepository.save(
        this.reviewRepository.create({
          productId: product.id,
          orderId: order.id,
          buyerId: buyer.id,
          sellerId: product.sellerId,
          rating: plan.rating,
          type: plan.type,
          status: ReviewStatus.APPROVED,
          isVerifiedPurchase: true,
          comment:
            plan.type === ReviewType.COMPLAINT
              ? "El producto llegó con fallas y no cumplió la descripción."
              : plan.type === ReviewType.NEUTRAL
                ? "Cumple, aunque el estado no era exactamente el esperado."
                : "Todo correcto, producto tal cual lo describe la auditoría.",
          complaintReason:
            plan.type === ReviewType.COMPLAINT
              ? "Producto defectuoso y devuelto con fallas reportadas."
              : undefined,
          createdAt,
        }),
      );
    }

    this.logger.log(
      `Seed demo: ${SELLERS.length} vendedores, ${products.length} productos y ${reviewPlan.length} reseñas creadas`,
    );
  }

  private async ensureNewProducts() {
    const specs: Array<{
      email: string;
      title: string;
      desc: string;
      price: number;
      category: ProductCategory;
      image: string;
      condition?: ProductCondition;
      sealed?: boolean;
      verified?: boolean;
      grade?: string;
      usageType?: string;
      coverageExtended?: boolean;
      warrantyDays?: number;
    }> = [
      {
        email: SELLERS[0].email,
        title: "Intel Core i5-14600K Sellado",
        desc: "Nuevo · 14 núcleos · LGA1700 · sin abrir, con sello de fábrica.",
        price: 320,
        category: ProductCategory.CPU,
        image: IMAGES.intel,
      },
      {
        email: SELLERS[1].email,
        title: "NVIDIA RTX 4060 OC Nueva",
        desc: "Nueva · sellada · garantía de fábrica intacta · cobertura extendida TechShield.",
        price: 330,
        category: ProductCategory.GPU,
        image: IMAGES.rtx,
        coverageExtended: true,
        warrantyDays: 120,
      },
      {
        email: SELLERS[2].email,
        title: "Samsung Galaxy S21 128GB",
        desc: "Precio llamativamente bajo, revisar antes de comprar.",
        price: 135,
        category: ProductCategory.PHONE,
        image: IMAGES.galaxy,
      },
      {
        email: SELLERS[0].email,
        title: "Kingston Fury Beast 16GB DDR4 3200MHz",
        desc: "Memoria RAM verificada con test de integridad.",
        price: 55,
        category: ProductCategory.RAM,
        image: "",
      },
      {
        email: SELLERS[1].email,
        title: "SSD M.2 NVMe Crucial P3 1TB",
        desc: "Unidad NVMe · test SMART al 100%.",
        price: 70,
        category: ProductCategory.STORAGE,
        image: "",
      },
      {
        email: SELLERS[0].email,
        title: "Notebook Gamer Lenovo Legion 5",
        desc: "Ryzen 7 + RTX 3060 · 16GB · 512GB SSD · verificada.",
        price: 980,
        category: ProductCategory.LAPTOP,
        image: "",
        verified: true,
        grade: "A",
      },
      // --- Nuevos sellados ---
      {
        email: SELLERS[0].email,
        title: "Samsung Galaxy S24 Ultra Sellado",
        desc: "Nuevo · 256GB · sin abrir, con sello de fábrica.",
        price: 980,
        category: ProductCategory.PHONE,
        image: IMAGES.galaxy,
        condition: ProductCondition.NEW,
        sealed: true,
        verified: true,
      },
      {
        email: SELLERS[0].email,
        title: "AMD Ryzen 9 7950X Sellado",
        desc: "Nuevo · 16 núcleos · AM5 · sin abrir, con sello.",
        price: 540,
        category: ProductCategory.CPU,
        image: IMAGES.ryzen,
        condition: ProductCondition.NEW,
        sealed: true,
        verified: true,
      },
      {
        email: SELLERS[1].email,
        title: "MacBook Air M3 13 Sellada",
        desc: "Nueva · 8GB · 256GB SSD · sin abrir, con sello.",
        price: 1090,
        category: ProductCategory.LAPTOP,
        image: "",
        condition: ProductCondition.NEW,
        sealed: true,
        verified: true,
      },
      // --- Seguros (usados verificados) ---
      {
        email: SELLERS[0].email,
        title: "AMD Ryzen 5 7600X verificado",
        desc: "Usado verificado · AM5 · excelente estado.",
        price: 210,
        category: ProductCategory.CPU,
        image: IMAGES.ryzen,
        verified: true,
        grade: "A+",
      },
      {
        email: SELLERS[1].email,
        title: "NVIDIA RTX 4070 Super verificada",
        desc: "Usada verificada · 12GB · sin coil whine.",
        price: 620,
        category: ProductCategory.GPU,
        image: IMAGES.rtx,
        verified: true,
        grade: "A",
      },
      {
        email: SELLERS[0].email,
        title: "DDR5 Corsair 32GB 6000MHz",
        desc: "RAM DDR5 verificada · test de estabilidad OK.",
        price: 130,
        category: ProductCategory.RAM,
        image: "",
        verified: true,
        grade: "A+",
      },
      // --- Inseguros (vendedor sin testing / uso intensivo) ---
      {
        email: SELLERS[2].email,
        title: "RTX 4090 sin factura",
        desc: "Uso intensivo/minería según declaración. Sin factura.",
        price: 890,
        category: ProductCategory.GPU,
        image: IMAGES.rtx,
        verified: false,
        usageType: "Minería",
      },
      {
        email: SELLERS[2].email,
        title: "iPhone 13 con detalles en pantalla",
        desc: "Pantalla con marcas · batería degradada.",
        price: 260,
        category: ProductCategory.PHONE,
        image: IMAGES.galaxy,
        verified: false,
        usageType: "Uso personal",
      },
    ];

    for (const spec of specs) {
      const existing = await this.productRepository.findOne({
        where: { title: spec.title },
      });
      if (existing) {
        if (spec.coverageExtended && !existing.coverageExtended) {
          existing.coverageExtended = true;
          existing.warrantyDays = spec.warrantyDays ?? existing.warrantyDays;
          await this.productRepository.save(existing);
          this.logger.log(`Cobertura extendida habilitada para: ${spec.title}`);
        }
        continue;
      }
      const seller = await this.userRepository.findOne({
        where: { email: spec.email },
      });
      if (!seller) continue;
      const isNew = spec.condition === ProductCondition.NEW;
      const data: DeepPartial<Product> = {
        title: spec.title,
        description: spec.desc,
        price: spec.price,
        condition: spec.condition ?? ProductCondition.USED,
        category: spec.category,
        status: ProductStatus.PUBLISHED,
        images: spec.image ? [spec.image] : [],
        verified: spec.verified ?? false,
        sealed: spec.sealed ?? false,
        conditionGrade: spec.grade || undefined,
        coverageExtended: spec.coverageExtended ?? false,
        warrantyDays: spec.warrantyDays ?? 90,
        hoursOfUse: 0,
        reportedHoursOfUse: 0,
        usageType:
          spec.usageType ?? (isNew ? "Nuevo · sin uso" : "Desconocido"),
        stressTest: spec.verified ? "Auditado por laboratorio TechShield" : "",
        physicalState: isNew
          ? "Nuevo, sin uso y sin sacar de la caja"
          : spec.verified
            ? "Verificado por laboratorio TechShield"
            : "Sin verificación previa",
        sellerId: seller.id,
      };
      await this.productRepository.save(this.productRepository.create(data));
      this.logger.log(`Producto agregado: ${spec.title}`);
    }
  }

  /** Asigna la imagen local (backend/public) a cada producto, si existe el archivo. */
  private async ensureProductImages() {
    for (const [title, image] of Object.entries(PRODUCT_IMAGES)) {
      const product = await this.productRepository.findOne({
        where: { title },
      });
      if (!product) continue;
      if (product.images?.[0] === image) continue;
      // Solo aplica si el archivo local existe (en backend/public).
      const filePath = join(
        process.cwd(),
        "public",
        image.replace(/^\/static\//, ""),
      );
      if (!fs.existsSync(filePath)) continue;
      product.images = [image];
      await this.productRepository.save(product);
      this.logger.log(`Imagen asignada a: ${title}`);
    }
  }

  private async ensureKycAndOtp() {
    const techlab = await this.userRepository.findOne({
      where: { email: SELLERS[0].email },
    });
    if (techlab && (!techlab.phoneVerified || !techlab.documentVerified)) {
      techlab.phoneVerified = true;
      techlab.documentVerified = true;
      await this.userRepository.save(techlab);
      this.logger.log("KYC (teléfono y documento) habilitado para TechLab Pro");
    }
  }

  private async ensureOpenComplaint() {
    const product = await this.productRepository.findOne({
      where: { title: "Samsung Galaxy S21" },
    });
    if (!product) return;

    const open = await this.reviewRepository
      .createQueryBuilder("review")
      .where("review.productId = :id", { id: product.id })
      .andWhere("review.type = :type", { type: ReviewType.COMPLAINT })
      .andWhere("review.status != :resolved", {
        resolved: ReviewStatus.RESOLVED,
      })
      .getOne();
    if (open) return;

    const buyer = await this.userRepository.findOne({
      where: { email: "buyer3@test.com" },
    });
    if (!buyer) return;

    const order = await this.orderRepository.save(
      this.orderRepository.create({
        productId: product.id,
        buyerId: buyer.id,
        total: product.price,
        status: OrderStatus.DELIVERED,
        custodyStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      }),
    );
    await this.reviewRepository.save(
      this.reviewRepository.create({
        productId: product.id,
        orderId: order.id,
        buyerId: buyer.id,
        sellerId: product.sellerId,
        rating: 1,
        type: ReviewType.COMPLAINT,
        status: ReviewStatus.PENDING,
        isVerifiedPurchase: true,
        comment: "Queja abierta: el teléfono llegó con la pantalla rayada.",
        complaintReason: "Producto defectuoso, queja aún sin resolver.",
      }),
    );
    this.logger.log("Queja abierta de ejemplo agregada a Samsung Galaxy S21");
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let orderId: string;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(TypeOrmModule)
      .useModule(
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
          synchronize: true,
        }),
      )
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Order Buyer',
        email: 'buyer@example.com',
        password: 'password123',
        role: 'buyer',
      });

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Order Seller',
        email: 'seller@example.com',
        password: 'password123',
        role: 'seller',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'buyer@example.com',
        password: 'password123',
      });
    authToken = loginResponse.body.access_token;

    const createProductResponse = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Product for Order',
        description: 'Test product',
        price: 250,
        condition: 'used',
        category: 'gpu',
      });
    productId = createProductResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/orders', () => {
    it('should create an order', () => {
      return request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          shippingAddress: 'Av. Corrientes 1234',
          paymentMethod: 'credit_card',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.total).toEqual(250);
          expect(res.body.status).toEqual('pending');
          orderId = res.body.id;
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/orders')
        .send({
          productId,
          shippingAddress: 'Av. Corrientes 1234',
        })
        .expect(401);
    });

    it('should fail with invalid product', () => {
      return request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'nonexistent-product-id',
          shippingAddress: 'Av. Corrientes 1234',
        })
        .expect(404);
    });
  });

  describe('GET /api/orders', () => {
    it('should return buyer orders', () => {
      return request(app.getHttpServer())
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
        });
    });

    it('should return empty array for new buyer', () => {
      return request(app.getHttpServer())
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
        });
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order by id', () => {
      return request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(orderId);
        });
    });

    it('should return 404 for non-existent order', () => {
      return request(app.getHttpServer())
        .get('/api/orders/nonexistent-id')
        .expect(404);
    });
  });

  describe('PATCH /api/orders/:id', () => {
    it('should update order status', () => {
      return request(app.getHttpServer())
        .patch(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'paid' })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toEqual('paid');
        });
    });

    it('should return 404 for non-existent order', () => {
      return request(app.getHttpServer())
        .patch('/api/orders/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'paid' })
        .expect(404);
    });
  });

  describe('POST /api/orders/:id/cancel', () => {
    it('should cancel an order', () => {
      return request(app.getHttpServer())
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toEqual('cancelled');
        });
    });

    it('should return 404 for non-existent order', () => {
      return request(app.getHttpServer())
        .post('/api/orders/nonexistent-id/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});

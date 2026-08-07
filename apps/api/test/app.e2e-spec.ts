import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Quote API tenant isolation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists only quotes from the caller organization', async () => {
    const response = await request(app.getHttpServer())
      .get('/quotes')
      .set('X-User-Id', 'user-alice')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe('quote-acme-1');
  });

  it('returns 404 when one tenant reads another tenant quote', async () => {
    await request(app.getHttpServer())
      .get('/quotes/quote-beta-1')
      .set('X-User-Id', 'user-alice')
      .expect(404);
  });

  it('returns 404 when one tenant tries to modify another tenant quote', async () => {
    await request(app.getHttpServer())
      .patch('/quotes/quote-beta-1')
      .set('X-User-Id', 'user-alice')
      .send({ customerName: 'Attempted overwrite' })
      .expect(404);

    const betaResponse = await request(app.getHttpServer())
      .get('/quotes/quote-beta-1')
      .set('X-User-Id', 'user-bob')
      .expect(200);

    expect(betaResponse.body.customerName).toBe('Taylor Customer');
  });

  it('computes the worked example total as $297 server-side', async () => {
    const response = await request(app.getHttpServer())
      .get('/quotes/quote-acme-1')
      .set('X-User-Id', 'user-alice')
      .expect(200);

    expect(response.body.totals.subtotal).toBe(275);
    expect(response.body.totals.taxAmount).toBe(22);
    expect(response.body.totals.total).toBe(297);
  });

  it('rejects organizationId supplied by a client', async () => {
    await request(app.getHttpServer())
      .post('/quotes')
      .set('X-User-Id', 'user-alice')
      .send({
        organizationId: 'org-beta',
        customerName: 'Should fail',
        taxRate: 0,
        sections: [],
      })
      .expect(400);
  });
});

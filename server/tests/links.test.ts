import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type { Express } from 'express';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const { createApp } = await import('../src/app.js');
const { User } = await import('../src/models/User.js');
const { Link } = await import('../src/models/Link.js');

let mongo: MongoMemoryServer;
let app: Express;
let token: string;

jest.setTimeout(30_000);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();

  const passwordHash = await User.hashPassword('s3cret!');
  await User.create({ username: 'admin', passwordHash });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 's3cret!' });
  token = res.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Link.deleteMany({});
});

describe('Auth', () => {
  test('rejects bad credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('issues a token for valid credentials', () => {
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });
});

describe('Links', () => {
  test('GET /api/links is public', async () => {
    const res = await request(app).get('/api/links');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/links requires admin', async () => {
    const res = await request(app).post('/api/links').send({ title: 'x', url: 'https://x.dev' });
    expect(res.status).toBe(401);
  });

  test('admin can create, update, delete links', async () => {
    const create = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Grafana', url: 'https://grafana.local', category: 'Observability' });
    expect(create.status).toBe(201);
    const id = create.body.id;
    expect(id).toBeTruthy();

    const update = await request(app)
      .put(`/api/links/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Grafana (prod)' });
    expect(update.status).toBe(200);
    expect(update.body.title).toBe('Grafana (prod)');

    const del = await request(app)
      .delete(`/api/links/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const after = await request(app).get('/api/links');
    expect(after.body).toHaveLength(0);
  });

  test('rejects invalid URL', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'broken', url: 'not-a-url' });
    expect(res.status).toBe(400);
  });
});

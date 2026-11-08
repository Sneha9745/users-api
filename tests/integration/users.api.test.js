
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createContainer } from '../../src/container.js';

const USERS = '/api/v1/users';

const sita = {
  firstName: 'Sita',
  lastName: 'Gurung',
  email: 'sita@example.com',
  password: 'Secret123',
  address: {
    street: 'Lakeside Road 5',
    city: 'Pokhara',
    country: 'Nepal',
  },
};

describe('Users API (integration)', () => {
  let app;
  let container;
  let auth;

  beforeEach(async () => {
    container = createContainer({
      hashPassword: async (plain) => `fake-hash:${plain}`,
    });

    const admin = await container.usersService.create(
      {
        firstName: 'Admin',
        lastName: 'Test',
        email: 'admin-test@example.com',
        password: 'AdminSecret123',
      },
      { role: 'admin' },
    );

    auth = {
      Authorization: `Bearer ${container.tokenService.signAccessToken(admin)}`,
    };

    app = createApp(container);
  });

  it('POST → 201, and the injected hasher was used', async () => {
    const res = await request(app).post(USERS).send(sita);

    expect(res.status).toBe(201);
    expect(res.body.data).not.toHaveProperty('passwordHash');

    const stored = await container.usersRepository.findById(
      res.body.data.id,
    );

    expect(stored.passwordHash).toBe('fake-hash:Secret123');
  });

  it('each test starts with an empty user store apart from admin', async () => {
    const res = await request(app).get(USERS).set(auth);

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
  });

  it('full lifecycle: create → get → patch → delete → 404', async () => {
    const { body } = await request(app).post(USERS).send(sita);
    const url = `${USERS}/${body.data.id}`;

    expect((await request(app).get(url).set(auth)).status).toBe(200);

    const updated = await request(app)
      .patch(url)
      .set(auth)
      .send({ phone: '+977-9811111111' });

    expect(updated.status).toBe(200);
    expect(updated.body.data.phone).toBe('+977-9811111111');

    expect((await request(app).delete(url).set(auth)).status).toBe(204);
    expect((await request(app).get(url).set(auth)).status).toBe(404);
  });

  describe('custom middleware', () => {
    it('requireJson: form-encoded POST → 415', async () => {
      const res = await request(app)
        .post(USERS)
        .type('form')
        .send('firstName=Sita');

      expect(res.status).toBe(415);
      expect(res.headers['content-type']).toMatch(
        /application\/problem\+json/,
      );
    });

    it('validateIdParam: GET /users/123 → 400 (not 404)', async () => {
      const res = await request(app).get(`${USERS}/123`).set(auth);

      expect(res.status).toBe(400);
      expect(res.body.detail).toBe('id must be a valid UUID');
    });

    it('validateIdParam also guards PATCH and DELETE', async () => {
      const patched = await request(app)
        .patch(`${USERS}/abc`)
        .set(auth)
        .send({ phone: '+977-9811111111' });

      expect(patched.status).toBe(400);

      const deleted = await request(app)
        .delete(`${USERS}/abc`)
        .set(auth);

      expect(deleted.status).toBe(400);
    });

    it('a valid but unknown UUID still reaches the service → 404', async () => {
      const res = await request(app)
        .get(`${USERS}/15cfde80-9253-4e58-a113-a87a9e67498a`)
        .set(auth);

      expect(res.status).toBe(404);
    });
  });

  it('a fake service can replace the real one entirely', async () => {
    const fakeService = {
      list: async () => ({
        data: [{ id: 'x', firstName: 'Fake' }],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      }),
    };

    const fakeContainer = createContainer({
      usersService: fakeService,
    });

    const fakeApp = createApp(fakeContainer);
    const fakeAuth = {
      Authorization: `Bearer ${fakeContainer.tokenService.signAccessToken({
        id: 'test-admin',
        role: 'admin',
      })}`,
    };

    const res = await request(fakeApp).get(USERS).set(fakeAuth);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'x', firstName: 'Fake' }]);
  });

  it('adds X-Response-Time header', async () => {
    const res = await request(app).get(USERS).set(auth);

    expect(res.headers['x-response-time']).toBe('3.42ms');
  });
});

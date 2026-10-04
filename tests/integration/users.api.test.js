import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

const fakeController = {
  list: async (req, res) => {
    res.json({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0 },
      links: {},
    });
  },

  getById: async (req, res) => {
    res.json({
      data: { id: req.params.id, firstName: 'Sita' },
    });
  },

  create: async (req, res) => {
    res.status(201).json({
      data: { id: '123', ...req.body },
    });
  },

  update: async (req, res) => {
    res.json({
      data: { id: req.params.id, ...req.body },
    });
  },

  remove: async (req, res) => {
    res.status(204).end();
  },
};

const app = createApp({ usersController: fakeController });

describe('Users API', () => {
  it('returns 415 for non-JSON POST', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Content-Type', 'text/plain')
      .send('hello');

    expect(res.status).toBe(415);
  });

  it('returns 400 for an invalid UUID', async () => {
    const res = await request(app).get(
      '/api/v1/users/not-a-uuid'
    );

    expect(res.status).toBe(400);
  });

  it('returns 200 for a valid user id', async () => {
    const res = await request(app).get(
      '/api/v1/users/123e4567-e89b-12d3-a456-426614174000'
    );

    expect(res.status).toBe(200);
  });
});
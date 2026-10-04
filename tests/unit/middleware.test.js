import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireJson } from '../../src/middleware/require-json.js';
import { validateIdParam } from '../../src/middleware/validate-id.js';

describe('requireJson', () => {
  it('rejects non-JSON bodies for POST', async () => {
    const app = express();
    app.use(requireJson);
    app.use(express.text());
    app.post('/test', (req, res) => res.sendStatus(204));

    const res = await request(app)
      .post('/test')
      .set('Content-Type', 'text/plain')
      .send('hello');

    expect(res.status).toBe(415);
  });

  it('allows JSON bodies for POST', async () => {
    const app = express();
    app.use(requireJson);
    app.use(express.json());
    app.post('/test', (req, res) => res.json(req.body));

    const res = await request(app)
      .post('/test')
      .set('Content-Type', 'application/json')
      .send({ hello: 'world' });

    expect(res.status).toBe(200);
  });
});

describe('validateIdParam', () => {
  it('rejects an invalid UUID', () => {
    const next = (err) => err;

    const err = validateIdParam(
      {},
      {},
      next,
      'not-a-uuid'
    );

    expect(err.status).toBe(400);
  });

  it('accepts a valid UUID', () => {
    let called = false;
    const next = () => {
      called = true;
    };

    validateIdParam(
      {},
      {},
      next,
      '123e4567-e89b-12d3-a456-426614174000'
    );

    expect(called).toBe(true);
  });
});

import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { makeImage, SVG_WITH_SCRIPT } from '../fakes/images.js';
import { MemoryStorage } from '../fakes/memory.storage.js';
import { bearer, buildTestApp, RAM, registerAs, SITA } from '../helpers.js';

const avatarUrl = (id) => `/api/v1/users/${id}/avatar`;

describe('Avatar API (integration)', () => {
  let app;
  let container;
  let tempDir;
  let sita;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'avatar-test-'));

    ({ app, container } = await buildTestApp({
      uploads: {
        driver: 'local',
        localDir: tempDir,
        publicBaseUrl: 'http://localhost:3000',
        maxBytes: 5 * 1024 * 1024,
      },
    }));

    sita = await registerAs(app, SITA);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('uploads an avatar and creates three WebP variants', async () => {
    const image = await makeImage();

    const res = await request(app)
      .post(avatarUrl(sita.user.id))
      .set(bearer(sita.token))
      .attach('avatar', image, {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.avatar).toHaveProperty('thumb');
    expect(res.body.data.avatar).toHaveProperty('small');
    expect(res.body.data.avatar).toHaveProperty('medium');

    const files = await readdir(
      path.join(tempDir, 'avatars', sita.user.id),
    );

    expect(files).toHaveLength(3);
    expect(files.every((file) => file.endsWith('.webp'))).toBe(true);
  });

  // BONUS: Test 16x16 blurred Base64 placeholder.
  it('creates a 16x16 blurred Base64 placeholder', async () => {
    const image = await makeImage();

    const res = await request(app)
      .post(avatarUrl(sita.user.id))
      .set(bearer(sita.token))
      .attach('avatar', image, {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);

    const placeholder = res.body.data.avatar.blurPlaceholder;

    expect(placeholder).toMatch(/^data:image\/webp;base64,/);

    const base64 = placeholder.split(',')[1];
    const metadata = await sharp(Buffer.from(base64, 'base64')).metadata();

    expect(metadata.width).toBe(16);
    expect(metadata.height).toBe(16);
    expect(metadata.format).toBe('webp');
  });

  it('replaces an existing avatar and deletes the old files', async () => {
    const firstImage = await makeImage();
    const first = await request(app)
      .post(avatarUrl(sita.user.id))
      .set(bearer(sita.token))
      .attach('avatar', firstImage, {
        filename: 'first.png',
        contentType: 'image/png',
      });

    expect(first.status).toBe(200);

    const oldVersion = first.body.data.avatar.version;

    const secondImage = await makeImage({ width: 600, height: 600 });
    const second = await request(app)
      .post(avatarUrl(sita.user.id))
      .set(bearer(sita.token))
      .attach('avatar', secondImage, {
        filename: 'second.png',
        contentType: 'image/png',
      });

    expect(second.status).toBe(200);
    expect(second.body.data.avatar.version).not.toBe(oldVersion);

    const files = await readdir(
      path.join(tempDir, 'avatars', sita.user.id),
    );

    expect(files).toHaveLength(3);
    expect(files.every((file) => !file.startsWith(oldVersion))).toBe(true);
  });

  it('deletes an avatar and removes all its files', async () => {
    const image = await makeImage();

    const upload = await request(app)
      .post(avatarUrl(sita.user.id))
      .set(bearer(sita.token))
      .attach('avatar', image, {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(upload.status).toBe(200);

    const remove = await request(app)
      .delete(avatarUrl(sita.user.id))
      .set(bearer(sita.token));

    expect(remove.status).toBe(200);
    expect(remove.body.data.avatar).toBeNull();

    const files = await readdir(
      path.join(tempDir, 'avatars', sita.user.id),
    );

    expect(files).toHaveLength(0);
  });

  it('returns 401 when uploading without authentication', async () => {
    const image = await makeImage();

    const res = await request(app)
      .post(avatarUrl(sita.user.id))
      .attach('avatar', image, {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(401);
  });

  it('returns 403 when another user tries to upload an avatar', async () => {
    const ram = await registerAs(app, RAM);
    const image = await makeImage();

    const res = await request(app)
      .post(avatarUrl(sita.user.id))
      .set(bearer(ram.token))
      .attach('avatar', image, {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(403);
  });

  it('returns 413 when the uploaded file exceeds the size limit', async () => {
    const largeFile = Buffer.alloc(5 * 1024 * 1024 + 1);

    const res = await request(app)
      .post(avatarUrl(sita.user.id))
      .set(bearer(sita.token))
      .attach('avatar', largeFile, {
        filename: 'large.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(413);
  });

  it('returns 415 when uploading a non-image file', async () => {
    const res = await request(app)
      .post(avatarUrl(sita.user.id))
      .set(bearer(sita.token))
      .attach('avatar', Buffer.from('This is a text file'), {
        filename: 'file.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(415);
  });

  it('returns 400 when the uploaded file is not a valid image', async () => {
    const res = await request(app)
      .post(avatarUrl(sita.user.id))
      .set(bearer(sita.token))
      .attach('avatar', Buffer.from('not a real image'), {
        filename: 'fake.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 when uploading with the wrong field name', async () => {
    const image = await makeImage();

    const res = await request(app)
      .post(avatarUrl(sita.user.id))
      .set(bearer(sita.token))
      .attach('wrong', image, {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 when no avatar file is uploaded', async () => {
    const res = await request(app)
      .post(avatarUrl(sita.user.id))
      .set(bearer(sita.token));

    expect(res.status).toBe(400);
  });

  it('returns 404 when direct upload is requested with local storage', async () => {
    const res = await request(app)
      .post(`${avatarUrl(sita.user.id)}/presign`)
      .set(bearer(sita.token))
      .send({
        contentType: 'image/png',
        size: 1024,
      });

    expect(res.status).toBe(404);
  });

  it('returns 415 when direct upload uses an unsupported content type', async () => {
    const res = await request(app)
      .post(`${avatarUrl(sita.user.id)}/presign`)
      .set(bearer(sita.token))
      .send({
        contentType: 'text/plain',
        size: 1024,
      });

    expect(res.status).toBe(415);
  });

  it('returns 413 when direct upload exceeds the size limit', async () => {
    const res = await request(app)
      .post(`${avatarUrl(sita.user.id)}/presign`)
      .set(bearer(sita.token))
      .send({
        contentType: 'image/png',
        size: 5 * 1024 * 1024 + 1,
      });

    expect(res.status).toBe(413);
  });

  it('returns 403 when completing another user’s direct upload', async () => {
    const res = await request(app)
      .post(`${avatarUrl(sita.user.id)}/complete`)
      .set(bearer(sita.token))
      .send({
        key: `incoming/${RAM.id}/test-upload`,
      });

    expect(res.status).toBe(403);
  });
});


import sharp from 'sharp';
import { badRequest, HttpError } from '../utils/http-error.js';

// Formats we accept as INPUT. Notice: no SVG — SVG is XML and can contain <script>.
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif']);

// Refuse "decompression bombs": a tiny file that decodes to a gigantic image and eats all RAM.
const MAX_PIXELS = 40_000_000; // e.g. 8000 x 5000

export const AVATAR_VARIANTS = [
  { name: 'thumb', size: 64 },
  { name: 'small', size: 256 },
  { name: 'medium', size: 512 },
];

export class ImageService {
  // Never trust the file name or the Content-Type header — look at the actual bytes.
  async inspect(buffer) {
    let meta;
    try {
      meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata();
    } catch {
      throw badRequest('The uploaded file is not a valid image');
    }

    if (!ALLOWED_FORMATS.has(meta.format)) {
      throw new HttpError(415, 'Unsupported Media Type', `Image format "${meta.format}" is not allowed`);
    }

    if (meta.width * meta.height > MAX_PIXELS) {
      throw badRequest('Image dimensions are too large');
    }

    return meta;
  }

  async createAvatarVariants(buffer) {
    await this.inspect(buffer);

    // Bonus: Create a tiny 16x16 blurred Base64 placeholder.
    const placeholderBuffer = await sharp(buffer, {
      limitInputPixels: MAX_PIXELS,
    })
      .rotate()
      .resize(16, 16, { fit: 'cover' })
      .blur(4)
      .webp({ quality: 30 })
      .toBuffer();

    const blurPlaceholder = `data:image/webp;base64,${placeholderBuffer.toString('base64')}`;

    const variants = await Promise.all(
      AVATAR_VARIANTS.map(async ({ name, size }) => {
        const output = await sharp(buffer, { limitInputPixels: MAX_PIXELS })
          .rotate()
          .resize(size, size, { fit: 'cover', position: 'attention' })
          .webp({ quality: 80 })
          .toBuffer();

        return { name, size, buffer: output, contentType: 'image/webp' };
      }),
    );

    return Object.assign(variants, { blurPlaceholder });
  }
}

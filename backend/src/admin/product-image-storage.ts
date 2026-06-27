import { randomUUID } from 'crypto';

export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const ALLOWED_PRODUCT_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export class ProductImageStorageConfigError extends Error {
  constructor(message = 'Supabase image storage is not configured') {
    super(message);
    this.name = 'ProductImageStorageConfigError';
  }
}

export class ProductImageStorageUploadError extends Error {
  constructor(message = 'Product image upload failed') {
    super(message);
    this.name = 'ProductImageStorageUploadError';
  }
}

export interface ProductImageUploadInput {
  productId: number;
  buffer: Buffer;
  contentType: string;
  originalName?: string;
}

export interface ProductImageUploadResult {
  bucket: string;
  objectPath: string;
  publicUrl: string;
}

function getStorageConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET_PRODUCT_IMAGES || 'product-images';

  if (!supabaseUrl || !serviceRoleKey || !bucket) {
    throw new ProductImageStorageConfigError(
      'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET_PRODUCT_IMAGES are required for image upload',
    );
  }

  return { supabaseUrl, serviceRoleKey, bucket };
}

function sanitizeFileBaseName(value?: string): string {
  const baseName = (value || 'product-image')
    .replace(/\.[a-z0-9]+$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);

  return baseName || 'product-image';
}

export async function uploadProductImageToStorage(input: ProductImageUploadInput): Promise<ProductImageUploadResult> {
  const extension = ALLOWED_PRODUCT_IMAGE_TYPES.get(input.contentType);
  if (!extension) {
    throw new ProductImageStorageUploadError('Unsupported image type');
  }

  if (input.buffer.length > PRODUCT_IMAGE_MAX_BYTES) {
    throw new ProductImageStorageUploadError('Image must be 5MB or smaller');
  }

  const { supabaseUrl, serviceRoleKey, bucket } = getStorageConfig();
  const fileName = `${Date.now()}-${randomUUID()}-${sanitizeFileBaseName(input.originalName)}.${extension}`;
  const objectPath = `products/${input.productId}/${fileName}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': input.contentType,
      'Cache-Control': '31536000',
      'x-upsert': 'false',
    },
    body: input.buffer as unknown as BodyInit,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ProductImageStorageUploadError(body || `Supabase Storage upload failed with ${response.status}`);
  }

  return {
    bucket,
    objectPath,
    publicUrl: `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`,
  };
}

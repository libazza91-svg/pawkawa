import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PetbarnPilotManifestItem, PetstockPilotManifestItem, RetailPilotManifestItem } from './types';

export const DEFAULT_PETSTOCK_MANIFEST_PATH = path.resolve(
  __dirname,
  'manifests/petstock-pilot-urls.json',
);

export const DEFAULT_PETBARN_MANIFEST_PATH = path.resolve(
  __dirname,
  'manifests/petbarn-pilot-urls.json',
);

function isPetstockProductUrl(value: string): boolean {
  return /^https:\/\/www\.petstock\.com\.au\/products\/[^?#]+$/i.test(value);
}

function isPetbarnProductUrl(value: string): boolean {
  return /^https:\/\/www\.petbarn\.com\.au\/p\/[^?#]+$/i.test(value);
}

function validateManifestItem<T extends RetailPilotManifestItem>(
  item: unknown,
  index: number,
  options: {
    retailer: T['retailer'];
    isValidUrl: (value: string) => boolean;
    urlDescription: string;
  },
): T {
  if (!item || typeof item !== 'object') {
    throw new Error(`Invalid manifest item at index ${index}: expected object`);
  }

  const record = item as Record<string, unknown>;
  const productUrl = String(record.product_url ?? '').trim();
  if (!options.isValidUrl(productUrl)) {
    throw new Error(`Invalid manifest item at index ${index}: product_url must be ${options.urlDescription}`);
  }
  if (record.retailer !== options.retailer) {
    throw new Error(`Invalid manifest item at index ${index}: retailer must be "${options.retailer}"`);
  }
  if (record.market !== 'AU') {
    throw new Error(`Invalid manifest item at index ${index}: market must be "AU"`);
  }
  if (record.currency !== 'AUD') {
    throw new Error(`Invalid manifest item at index ${index}: currency must be "AUD"`);
  }

  const expectedPackSize = record.expected_pack_size_g;
  if (expectedPackSize !== undefined && (!Number.isFinite(expectedPackSize) || Number(expectedPackSize) <= 0)) {
    throw new Error(`Invalid manifest item at index ${index}: expected_pack_size_g must be a positive number`);
  }

  return {
    retailer: options.retailer,
    market: 'AU',
    currency: 'AUD',
    product_url: productUrl,
    expected_brand: typeof record.expected_brand === 'string' ? record.expected_brand.trim() : undefined,
    expected_pack_size_g: expectedPackSize === undefined ? undefined : Number(expectedPackSize),
    expected_canonical_slug:
      typeof record.expected_canonical_slug === 'string' ? record.expected_canonical_slug.trim() : undefined,
    notes: typeof record.notes === 'string' ? record.notes.trim() : undefined,
  } as T;
}

async function loadManifest<T extends RetailPilotManifestItem>(
  manifestPath: string,
  options: {
    retailer: T['retailer'];
    isValidUrl: (value: string) => boolean;
    urlDescription: string;
    label: string;
  },
): Promise<T[]> {
  const manifestText = await readFile(manifestPath, 'utf8');
  const parsed = JSON.parse(manifestText) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`${options.label} manifest must contain a top-level array`);
  }

  return parsed.map((item, index) => validateManifestItem<T>(item, index, options));
}

export async function loadPetstockManifest(
  manifestPath = DEFAULT_PETSTOCK_MANIFEST_PATH,
): Promise<PetstockPilotManifestItem[]> {
  return loadManifest<PetstockPilotManifestItem>(manifestPath, {
    retailer: 'petstock',
    isValidUrl: isPetstockProductUrl,
    urlDescription: 'a Petstock /products/ URL',
    label: 'Petstock',
  });
}

export async function loadPetbarnManifest(
  manifestPath = DEFAULT_PETBARN_MANIFEST_PATH,
): Promise<PetbarnPilotManifestItem[]> {
  return loadManifest<PetbarnPilotManifestItem>(manifestPath, {
    retailer: 'petbarn',
    isValidUrl: isPetbarnProductUrl,
    urlDescription: 'a Petbarn /p/ product URL',
    label: 'Petbarn',
  });
}

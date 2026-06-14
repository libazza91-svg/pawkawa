export type Species = 'Cat' | 'Dog';
export type LifeStage = 'Kitten' | 'Puppy' | 'Adult' | 'Senior' | 'All Life Stages';
export type VerificationGrade = 'GOLD' | 'SILVER' | 'BRONZE' | 'UNVERIFIED';
export type MarketAvailability = 'ACTIVE' | 'LIMITED' | 'DISCONTINUED';

export type PriceSource = {
  retailer: string;
  packSize: string;
  price: number;
  unitPriceKg: number;
  sourceUrl: string;
  status: 'Verified' | 'Needs review';
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  species: Species;
  lifeStage: LifeStage;
  country: 'Australia' | 'New Zealand' | 'Canada' | 'United States';
  verificationGrade: VerificationGrade;
  confidence: number;
  marketAvailability: MarketAvailability;
  sourceCount: number;
  verifiedSources: number;
  lastChecked: string;
  conflictStatus: 'No conflicts' | 'Minor price variance' | 'Nutrition label mismatch';
  nutrition: {
    protein: number;
    fat: number;
    fiber: number;
    calories: number;
    moisture: number;
    ash: number;
    phosphorus: number;
  };
  ingredientsRaw: string;
  ingredientsNormalized: string[];
  ingredientCategories: string[];
  controversialIngredients: string[];
  suitability: string[];
  prices: PriceSource[];
};

export type Brand = {
  slug: string;
  name: string;
  country: string;
  website: string;
};

export const brands: Brand[] = [
  { slug: 'ziwi-peak', name: 'Ziwi Peak', country: 'New Zealand', website: 'https://www.ziwipets.com' },
  { slug: 'black-hawk', name: 'Black Hawk', country: 'Australia', website: 'https://blackhawkpetcare.com' },
  { slug: 'royal-canin', name: 'Royal Canin', country: 'France', website: 'https://www.royalcanin.com' },
  { slug: 'ivory-coat', name: 'Ivory Coat', country: 'Australia', website: 'https://www.ivorycoat.com.au' },
  { slug: 'advance', name: 'Advance', country: 'Australia', website: 'https://www.advancepet.com.au' },
  { slug: 'feline-natural', name: 'Feline Natural', country: 'New Zealand', website: 'https://www.felinenatural.com' }
];

export const products: Product[] = [
  {
    id: 'ziwi-peak-mackerel-lamb',
    slug: 'ziwi-peak-air-dried-mackerel-lamb',
    name: 'Air-Dried Mackerel & Lamb',
    brand: 'Ziwi Peak',
    brandSlug: 'ziwi-peak',
    species: 'Cat',
    lifeStage: 'All Life Stages',
    country: 'New Zealand',
    verificationGrade: 'GOLD',
    confidence: 96,
    marketAvailability: 'ACTIVE',
    sourceCount: 6,
    verifiedSources: 5,
    lastChecked: '12 Jun 2026',
    conflictStatus: 'No conflicts',
    nutrition: { protein: 38, fat: 30, fiber: 2, calories: 5500, moisture: 14, ash: 12, phosphorus: 1.4 },
    ingredientsRaw: 'Mackerel, lamb, lamb tripe, lamb heart, lamb lung, New Zealand green mussel, lecithin, minerals, kelp.',
    ingredientsNormalized: ['Mackerel', 'Lamb', 'Lamb organ meat', 'Green mussel', 'Kelp', 'Minerals'],
    ingredientCategories: ['Animal protein', 'Organ meat', 'Marine omega', 'Mineral premix'],
    controversialIngredients: [],
    suitability: ['High Protein', 'Sensitive Stomach', 'Indoor Cat'],
    prices: [
      { retailer: 'Pet Circle', packSize: '400g', price: 43.99, unitPriceKg: 109.98, sourceUrl: 'https://www.petcircle.com.au', status: 'Verified' },
      { retailer: 'Petbarn', packSize: '400g', price: 45.49, unitPriceKg: 113.73, sourceUrl: 'https://www.petbarn.com.au', status: 'Verified' }
    ]
  },
  {
    id: 'black-hawk-indoor-chicken-rice',
    slug: 'black-hawk-indoor-chicken-rice',
    name: 'Indoor Chicken & Rice',
    brand: 'Black Hawk',
    brandSlug: 'black-hawk',
    species: 'Cat',
    lifeStage: 'Adult',
    country: 'Australia',
    verificationGrade: 'SILVER',
    confidence: 84,
    marketAvailability: 'ACTIVE',
    sourceCount: 4,
    verifiedSources: 3,
    lastChecked: '11 Jun 2026',
    conflictStatus: 'Minor price variance',
    nutrition: { protein: 32, fat: 15, fiber: 5, calories: 3650, moisture: 10, ash: 8, phosphorus: 0.9 },
    ingredientsRaw: 'Chicken meal, rice, oats, chicken fat, beet pulp, fish oil, vitamins, minerals, taurine.',
    ingredientsNormalized: ['Chicken meal', 'Rice', 'Oats', 'Chicken fat', 'Beet pulp', 'Fish oil', 'Taurine'],
    ingredientCategories: ['Animal protein', 'Grain', 'Functional fiber', 'Omega oil'],
    controversialIngredients: [],
    suitability: ['Weight Control', 'Indoor Cat'],
    prices: [
      { retailer: 'Woolworths', packSize: '2kg', price: 31, unitPriceKg: 15.5, sourceUrl: 'https://www.woolworths.com.au', status: 'Verified' },
      { retailer: 'Pet Circle', packSize: '2kg', price: 33.99, unitPriceKg: 17, sourceUrl: 'https://www.petcircle.com.au', status: 'Needs review' }
    ]
  },
  {
    id: 'royal-canin-sterilised-37',
    slug: 'royal-canin-sterilised-37',
    name: 'Sterilised 37',
    brand: 'Royal Canin',
    brandSlug: 'royal-canin',
    species: 'Cat',
    lifeStage: 'Adult',
    country: 'Australia',
    verificationGrade: 'SILVER',
    confidence: 88,
    marketAvailability: 'ACTIVE',
    sourceCount: 5,
    verifiedSources: 4,
    lastChecked: '10 Jun 2026',
    conflictStatus: 'No conflicts',
    nutrition: { protein: 37, fat: 12, fiber: 6.2, calories: 3509, moisture: 8, ash: 8.1, phosphorus: 0.85 },
    ingredientsRaw: 'Dehydrated poultry protein, vegetable fibres, rice, maize, animal fats, hydrolysed animal proteins.',
    ingredientsNormalized: ['Poultry protein', 'Vegetable fiber', 'Rice', 'Maize', 'Animal fat'],
    ingredientCategories: ['Animal protein', 'Grain', 'Functional fiber'],
    controversialIngredients: ['Generic animal fat'],
    suitability: ['Weight Control', 'Indoor Cat'],
    prices: [
      { retailer: 'Petbarn', packSize: '2kg', price: 56.99, unitPriceKg: 28.5, sourceUrl: 'https://www.petbarn.com.au', status: 'Verified' }
    ]
  },
  {
    id: 'feline-natural-lamb-feast',
    slug: 'feline-natural-freeze-dried-lamb-feast',
    name: 'Freeze-Dried Lamb Feast',
    brand: 'Feline Natural',
    brandSlug: 'feline-natural',
    species: 'Cat',
    lifeStage: 'All Life Stages',
    country: 'New Zealand',
    verificationGrade: 'GOLD',
    confidence: 94,
    marketAvailability: 'LIMITED',
    sourceCount: 5,
    verifiedSources: 5,
    lastChecked: '09 Jun 2026',
    conflictStatus: 'No conflicts',
    nutrition: { protein: 40, fat: 31, fiber: 2.5, calories: 4850, moisture: 8, ash: 9, phosphorus: 1.1 },
    ingredientsRaw: 'Lamb, lamb heart, lamb kidney, lamb liver, lamb blood, flaxseed flakes, New Zealand green mussel.',
    ingredientsNormalized: ['Lamb', 'Lamb organ meat', 'Flaxseed', 'Green mussel'],
    ingredientCategories: ['Animal protein', 'Organ meat', 'Marine omega'],
    controversialIngredients: [],
    suitability: ['High Protein', 'Sensitive Stomach', 'Kitten Growth'],
    prices: [
      { retailer: 'Pet Circle', packSize: '320g', price: 52.99, unitPriceKg: 165.59, sourceUrl: 'https://www.petcircle.com.au', status: 'Verified' }
    ]
  },
  {
    id: 'ivory-coat-lamb-brown-rice',
    slug: 'ivory-coat-lamb-brown-rice-adult-dog',
    name: 'Lamb & Brown Rice Adult',
    brand: 'Ivory Coat',
    brandSlug: 'ivory-coat',
    species: 'Dog',
    lifeStage: 'Adult',
    country: 'Australia',
    verificationGrade: 'BRONZE',
    confidence: 72,
    marketAvailability: 'ACTIVE',
    sourceCount: 3,
    verifiedSources: 2,
    lastChecked: '08 Jun 2026',
    conflictStatus: 'Nutrition label mismatch',
    nutrition: { protein: 26, fat: 14, fiber: 4, calories: 3620, moisture: 10, ash: 7.5, phosphorus: 0.8 },
    ingredientsRaw: 'Lamb meal, brown rice, peas, chicken fat, beet pulp, natural flavour, vitamins and minerals.',
    ingredientsNormalized: ['Lamb meal', 'Brown rice', 'Peas', 'Chicken fat', 'Beet pulp'],
    ingredientCategories: ['Animal protein', 'Grain', 'Legume', 'Functional fiber'],
    controversialIngredients: ['Natural flavour'],
    suitability: ['Sensitive Stomach', 'Adult Maintenance'],
    prices: [
      { retailer: 'Petbarn', packSize: '13kg', price: 139.99, unitPriceKg: 10.77, sourceUrl: 'https://www.petbarn.com.au', status: 'Needs review' }
    ]
  },
  {
    id: 'advance-puppy-growth',
    slug: 'advance-puppy-growth-chicken',
    name: 'Puppy Growth Chicken',
    brand: 'Advance',
    brandSlug: 'advance',
    species: 'Dog',
    lifeStage: 'Puppy',
    country: 'Australia',
    verificationGrade: 'SILVER',
    confidence: 82,
    marketAvailability: 'ACTIVE',
    sourceCount: 4,
    verifiedSources: 3,
    lastChecked: '07 Jun 2026',
    conflictStatus: 'No conflicts',
    nutrition: { protein: 30, fat: 19, fiber: 3.5, calories: 3920, moisture: 10, ash: 7.2, phosphorus: 1 },
    ingredientsRaw: 'Chicken meal, rice, maize gluten, chicken fat, fish oil, beet pulp, vitamins and minerals.',
    ingredientsNormalized: ['Chicken meal', 'Rice', 'Maize gluten', 'Chicken fat', 'Fish oil'],
    ingredientCategories: ['Animal protein', 'Grain', 'Omega oil'],
    controversialIngredients: ['Maize gluten'],
    suitability: ['Puppy Growth', 'High Protein'],
    prices: [
      { retailer: 'Pet Circle', packSize: '3kg', price: 48.99, unitPriceKg: 16.33, sourceUrl: 'https://www.petcircle.com.au', status: 'Verified' }
    ]
  }
];

export const speciesOptions: Array<'All Species' | Species> = ['All Species', 'Cat', 'Dog'];
export const lifeStageOptions: Array<'All Life Stages' | LifeStage> = ['All Life Stages', 'Kitten', 'Puppy', 'Adult', 'Senior'];
export const gradeOptions: Array<'All Grades' | VerificationGrade> = ['All Grades', 'GOLD', 'SILVER', 'BRONZE', 'UNVERIFIED'];

export function getAverageConfidence(items: Product[]) {
  if (items.length === 0) return 0;
  return Math.round(items.reduce((sum, product) => sum + product.confidence, 0) / items.length);
}

export function getPrimaryPrice(product: Product) {
  return [...product.prices].sort((a, b) => a.unitPriceKg - b.unitPriceKg)[0];
}

import { useEffect, useMemo, useState } from 'react';
import {
  brands,
  getAverageConfidence,
  getPrimaryPrice,
  gradeOptions,
  lifeStageOptions,
  products,
  speciesOptions,
  type Product,
  type VerificationGrade
} from './data';
import type {
  CompareRecommendationResponse,
  CompareResponse,
  Filters,
  MarketConfig,
  MarketRegion,
  MarketsResponse,
  PriceComparisonResponse,
  PriceSearchResponse,
  PriceSearchResult,
  ProductInsight,
  ProductListResponse,
  RecommendationContext,
  RetailOffer,
  VerifiedProductDetailResponse,
  VerifiedProductListItem,
  VerifiedProductListResponse
} from './app-types';
import { readApi } from './api';
import { AdminAppShell } from './admin/AdminAppShell';
import { AdminLoginPage } from './admin/AdminLoginPage';
import { LivingCat } from './components/LivingCat';
import {
  AppHeader,
  ConfidenceMeter,
  EmptyState,
  IngredientTag,
  InsightList,
  NutritionCard,
  PriceCard,
  SectionHeader,
  TrustBadge
} from './components/ui';
import { ComparePage } from './pages/ComparePage';
import { parseRoute } from './routing';

const defaultFilters: Filters = {
  keyword: '',
  brand: 'All Brands',
  species: 'Cat',
  lifeStage: 'All Life Stages',
  grade: 'All Grades',
  maxPrice: 180
};

const homeNextSteps = [
  {
    title: 'Compare product context',
    note: 'Use Product Compare after price checking when you want to review nutrition, ingredients and confidence side by side.',
    actionLabel: 'Open Product Compare',
    href: '/compare'
  },
  {
    title: 'Learn how the data is checked',
    note: 'See how tracked retailer prices, product records and verification wording are kept restrained and practical.',
    actionLabel: 'Open Learn',
    href: '/learn'
  },
  {
    title: 'Review our sources and methods',
    note: 'Read where our information comes from, how we compare offers, and how confidence is tested before publishing.',
    actionLabel: 'Open About',
    href: '/about'
  }
] as const;

const priceSearchExamples = ['Royal Canin Indoor 4kg', 'Black Hawk Indoor Chicken', 'Ziwi Peak cat food'] as const;
const homepagePreviewSlugs = [
  'royal-canin-indoor-adult-4000g',
  'black-hawk-indoor-chicken-rice-2000g',
  'hills-science-diet-indoor-adult-4000g'
] as const;

const trustReasons = [
  {
    title: 'Tracked retailer pricing',
    body: 'We compare offers from retailers currently connected to the MVP and label coverage so you know how much of the market is represented.'
  },
  {
    title: 'Conditional prices stay separate',
    body: 'Member, coupon and minimum-spend prices are shown as conditions, not treated as guaranteed best price.'
  },
  {
    title: 'AU-first and source-gated',
    body: 'Public pages rely on AU tracked retailer data and source hygiene checks before a product is used in demos or ranking.'
  }
] as const;

const learnTopics = [
  {
    title: 'How a price check is built',
    body: 'Pawkawa starts with an exact cat food product, then groups matching retailer offers under the same canonical product so you can compare price, stock and unit cost.'
  },
  {
    title: 'What tracked retailers means',
    body: 'Tracked retailers are sources currently connected, checked and allowed into public ranking. This is different from claiming full coverage of every Australian store.'
  },
  {
    title: 'Why source freshness matters',
    body: 'Prices, stock and promotions can change quickly. Last-checked labels and coverage notes help you decide whether a result is current enough to trust.'
  },
  {
    title: 'Why member and coupon prices are separate',
    body: 'A lower price is only comparable when every shopper can use it. Membership, coupon and minimum-spend prices are shown as conditional context, not as the main winning price.'
  },
  {
    title: 'How coverage labels work',
    body: 'Coverage labels describe how many tracked retailers currently have offers for the product. Limited coverage is still shown honestly, but it should not be mistaken for whole-market coverage.'
  },
  {
    title: 'What Pawkawa does not claim yet',
    body: 'Pawkawa does not claim to be the cheapest in Australia, does not replace retailer checkout pages, and does not provide veterinary treatment advice.'
  }
] as const;

const aboutMethodSections = [
  {
    title: 'AU-first scope',
    points: [
      'The current MVP focuses on Australian cat food price comparison.',
      'New Zealand support is planned structurally, but should stay disabled until NZ retailer data is separately validated.',
      'Dog food and medical recommendation workflows are outside the current public MVP boundary.'
    ]
  },
  {
    title: 'Current tracked retailers',
    points: [
      'Petstock and Petbarn controlled ingestion are the current real retailer sources.',
      'Retailer offers are only public-ready when product identity, pack size, market, currency and source URL are clear.',
      'Feed candidates and fixtures must not appear as normal tracked retailers in public price ranking.'
    ]
  },
  {
    title: 'How price comparison works',
    points: [
      'We compare the exact product first, including brand, formula wording and pack size.',
      'We separate unconditional effective price from membership, coupon and minimum-spend pricing.',
      'We keep market and currency isolated so AU and NZ offers are not mixed together.'
    ]
  },
  {
    title: 'Source hygiene policy',
    points: [
      'Fixture offers are development data and should not influence public price ranking.',
      'Orphan rows stay quarantined until a product decision is made.',
      'Source hygiene reports and staging gates should run before controlled demos or public releases.'
    ]
  },
  {
    title: 'Coverage limitations',
    points: [
      'Pawkawa can say best price found from tracked retailers, not cheapest in Australia.',
      'Confidence should fall when pack size, formula wording or offer conditions are ambiguous.',
      'Every important price claim should map back to a retailer source record.'
    ]
  }
] as const;

const mascotStatuses = ['Checking sources', 'Checking tracked offers', 'Updating prices', 'Separating member deals'] as const;

const productPlaceholderImages: Record<string, string> = {
  'ziwi-peak-air-dried-mackerel-lamb': 'https://placehold.co/320x420/f3ead9/5f6d57?text=Ziwi+Peak',
  'black-hawk-indoor-chicken-rice': 'https://placehold.co/320x420/efe8de/6a604f?text=Black+Hawk',
  'royal-canin-sterilised-37': 'https://placehold.co/320x420/f6ece2/9a6c4f?text=Royal+Canin',
  'feline-natural-freeze-dried-lamb-feast': 'https://placehold.co/320x420/f4ead8/8a7352?text=Feline+Natural'
};

const catProducts = products.filter((product) => product.species === 'Cat');

function getProductPlaceholderImage(product: Product) {
  return product.primaryImageUrl || productPlaceholderImages[product.slug] || 'https://placehold.co/320x420/f4ecdd/6b5e50?text=Product+Image';
}

function toBrandSlug(brandName: string) {
  return brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toDisplayLifeStage(lifeStage: VerifiedProductListItem['life_stage']): Product['lifeStage'] {
  if (lifeStage === 'ALL_LIFE_STAGES') return 'All Life Stages';
  if (lifeStage === 'KITTEN') return 'Kitten';
  if (lifeStage === 'PUPPY') return 'Puppy';
  if (lifeStage === 'SENIOR') return 'Senior';
  return 'Adult';
}

function toDisplaySpecies(species: VerifiedProductListItem['species']): Product['species'] {
  return species === 'DOG' ? 'Dog' : 'Cat';
}

function toInsightFromVerified(item: VerifiedProductListItem, detail?: VerifiedProductDetailResponse): ProductInsight {
  return {
    product_id: item.product_id,
    quick_verdict: detail?.quick_verdict || item.quick_verdict,
    strengths: detail?.strengths || item.strengths,
    considerations: detail?.considerations || item.considerations,
    best_for: detail?.best_for || item.best_for,
    avoid_if: detail?.avoid_if || [],
    confidence: item.confidence,
    trust_grade: item.trust_grade
  };
}

function toProductFromVerified(item: VerifiedProductListItem, detail?: VerifiedProductDetailResponse): Product {
  const fallback = products.find((product) => product.slug === item.slug);
  const retailOffers = detail?.retail_offers || [];

  return {
    id: item.product_id,
    slug: item.slug,
    name: item.product_name,
    brand: item.brand_name,
    brandSlug: fallback?.brandSlug || toBrandSlug(item.brand_name),
    species: toDisplaySpecies(item.species),
    lifeStage: toDisplayLifeStage(item.life_stage),
    country: fallback?.country || 'Australia',
    verificationGrade: item.trust_grade,
    confidence: item.confidence,
    marketAvailability: item.market_availability,
    sourceCount: item.source_count,
    verifiedSources: fallback?.verifiedSources || Math.max(1, Math.min(item.source_count, item.trust_grade === 'GOLD' ? item.source_count : item.source_count - 1)),
    lastChecked: fallback?.lastChecked || 'Just now',
    conflictStatus: fallback?.conflictStatus || 'No conflicts',
    nutrition: detail?.nutrition_profile || fallback?.nutrition || { protein: 0, fat: 0, fiber: 0, calories: 0, moisture: 0, ash: 0, phosphorus: 0 },
    ingredientsRaw: fallback?.ingredientsRaw || detail?.ingredient_profile.normalized_ingredients.join(', ') || 'Verified ingredient profile available from backend.',
    ingredientsNormalized: detail?.ingredient_profile.normalized_ingredients || fallback?.ingredientsNormalized || [],
    ingredientCategories: fallback?.ingredientCategories || [],
    controversialIngredients: detail?.ingredient_profile.controversial_ingredients || fallback?.controversialIngredients || [],
    suitability: detail?.ingredient_profile.suitability_tags || item.best_for || fallback?.suitability || [],
    prices:
      retailOffers.length > 0
        ? retailOffers.map((offer) => ({
            retailer: offer.retailer,
            packSize: 'Current offer',
            price: offer.price_aud,
            unitPriceKg: offer.unit_price_per_kg,
            sourceUrl: offer.source_url,
            status: 'Verified'
          }))
        : fallback?.prices || [
            {
              retailer: 'Verified catalog',
              packSize: 'Current offer',
              price: item.price_from,
              unitPriceKg: item.unit_price_per_kg,
              sourceUrl: `/product/${item.slug}`,
              status: 'Verified'
            }
          ],
    primaryImageUrl: detail?.image_metadata[0]?.image_url || item.primary_image_url
  };
}

function formatMoney(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) return '-';
  return `${currency} $${value.toFixed(2)}`;
}

function isPlaceholderImageUrl(value?: string) {
  return !value || value.includes('placehold.co');
}

function getRetailOfferImageUrl(offers: RetailOffer[]) {
  for (const offer of offers as Array<RetailOffer & { metadata?: { image_url?: string } }>) {
    if (offer.metadata?.image_url) return offer.metadata.image_url;
    if (offer.primary_image_url && !isPlaceholderImageUrl(offer.primary_image_url)) return offer.primary_image_url;
  }

  return undefined;
}

function formatPackSize(sizeG: number) {
  return sizeG >= 1000 ? `${Number((sizeG / 1000).toFixed(2))}kg` : `${sizeG}g`;
}

function getTrackedRetailerCount(offers: Pick<RetailOffer, 'retailer_slug'>[]) {
  return new Set(offers.map((offer) => offer.retailer_slug)).size;
}

function getCoverageStatus(retailerCount: number) {
  if (retailerCount <= 0) {
    return {
      shortLabel: 'No offers',
      heading: 'No tracked offers yet',
      detail: 'No tracked offers yet',
      tone: 'none' as const
    };
  }

  if (retailerCount === 1) {
    return {
      shortLabel: 'Limited coverage',
      heading: 'Limited coverage',
      detail: 'Limited coverage — currently tracking 1 retailer for this product.',
      tone: 'limited' as const
    };
  }

  if (retailerCount === 2) {
    return {
      shortLabel: 'Basic coverage',
      heading: 'Basic coverage',
      detail: 'Basic coverage — currently tracking 2 retailers for this product.',
      tone: 'basic' as const
    };
  }

  return {
    shortLabel: 'Good coverage',
    heading: 'Good coverage',
    detail: 'Good coverage — currently tracking 3+ retailers for this product.',
    tone: 'good' as const
  };
}

function formatCheckedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getLastCheckedDisplay(values: string[]) {
  const timestamps = values
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  if (timestamps.length === 0) return 'Last checked unknown';

  const latest = timestamps[0];
  const now = new Date();
  const dayDelta = Math.floor((now.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24));

  if (dayDelta <= 0) return 'Last checked today';
  if (dayDelta === 1) return 'Last checked 1 day ago';
  if (dayDelta === 2) return 'Last checked 2 days ago';
  return 'Last checked recently';
}

function getMarketLabel(market: MarketRegion) {
  return market === 'AU' ? 'AU market' : 'NZ market';
}

function getTrackedRetailersLabel(count: number) {
  return `${count} retailer${count === 1 ? '' : 's'} tracked`;
}

function getCurrentTrackedRetailersNote(offers: RetailOffer[]) {
  const trackedRetailers = [...new Set(offers.map((offer) => offer.retailer_name))];

  if (trackedRetailers.length === 0) {
    return 'Prices are based on currently tracked retailers and may change.';
  }

  return `Prices are based on currently tracked retailers and may change. Currently tracking ${trackedRetailers.join(', ')} for this product.`;
}

function MarketSelector({
  markets,
  selectedMarket,
  onSelect
}: {
  markets: MarketConfig[];
  selectedMarket: MarketRegion;
  onSelect: (market: MarketRegion) => void;
}) {
  return (
    <div className="market-selector" aria-label="Market selector">
      {markets.map((market) => (
        <button
          className={selectedMarket === market.market ? 'active' : ''}
          disabled={!market.enabled}
          key={market.market}
          onClick={() => onSelect(market.market)}
          type="button"
        >
          <span>{market.market === 'AU' ? 'Australia' : 'New Zealand'}</span>
          <small>{market.currency}{market.enabled ? '' : ' · Coming soon'}</small>
        </button>
      ))}
    </div>
  );
}

function ProductSearchBox({
  keyword,
  onKeywordChange,
  onSubmit
}: {
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="hero-searchbar price-search-box">
      <input
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSubmit();
        }}
        placeholder="Search Royal Canin Indoor 4kg"
      />
      <button className="primary-button" onClick={onSubmit} type="button">
        Compare prices
      </button>
    </div>
  );
}

function ProductImageFallback({ imageUrl, productName, brandName }: { imageUrl?: string; productName: string; brandName: string }) {
  if (imageUrl) {
    return <img alt={productName} src={imageUrl} />;
  }

  return (
    <div className="brand-image-fallback" aria-label={`${brandName} product image placeholder`}>
      <span>{brandName}</span>
    </div>
  );
}

function PriceSummaryCard({
  result,
  onOpen,
  variant = 'default'
}: {
  result: PriceSearchResult;
  onOpen: (slug: string) => void;
  variant?: 'default' | 'compact';
}) {
  const coverage = getCoverageStatus(result.offer_count);
  const isCompact = variant === 'compact';

  return (
    <article className={`price-result-card ${isCompact ? 'compact' : ''}`}>
      <div className="price-result-image">
        <ProductImageFallback brandName={result.brand_name} imageUrl={result.primary_image_url} productName={result.product_name} />
      </div>
      <div className="price-result-body">
        <div className="card-topline">
          <span className={`coverage-badge coverage-${coverage.tone}`}>{coverage.shortLabel}</span>
          <span>{getMarketLabel(result.market)}</span>
        </div>
        <h3>{result.product_name}</h3>
        <p className="brand-name">{result.brand_name}</p>
        <div className={`primary-price-read ${isCompact ? 'compact' : ''}`}>
          <small>From price</small>
          <strong>{formatMoney(result.lowest_effective_price, result.currency)}</strong>
          <span>{result.best_retailer ? `Best at ${result.best_retailer}` : 'No active offer yet'}</span>
        </div>
        {isCompact ? (
          <div className="price-card-tags">
            <span>{getTrackedRetailersLabel(result.offer_count)}</span>
            <span>{result.lowest_unit_price_per_kg ? `${formatMoney(result.lowest_unit_price_per_kg, result.currency)} / kg` : 'Unit price unavailable'}</span>
          </div>
        ) : (
          <div className="price-summary-grid compact-price-summary">
            <span>
              <small>Tracked retailers</small>
              <strong>{getTrackedRetailersLabel(result.offer_count)}</strong>
            </span>
            <span>
              <small>Coverage</small>
              <strong>{coverage.shortLabel}</strong>
            </span>
            <span>
              <small>Best retailer</small>
              <strong>{result.best_retailer || 'No active offer yet'}</strong>
            </span>
            <span>
              <small>Unit price</small>
              <strong>{result.lowest_unit_price_per_kg ? `${formatMoney(result.lowest_unit_price_per_kg, result.currency)} / kg` : '-'}</strong>
            </span>
          </div>
        )}
        {result.offer_count <= 1 && <p className="coverage-note">{coverage.detail}</p>}
        <button className={isCompact ? 'secondary-button compact-card-cta' : 'primary-button'} onClick={() => onOpen(result.slug)} type="button">
          View retailer prices
        </button>
      </div>
    </article>
  );
}

function PriceSearchResults({
  results,
  loading,
  error,
  onOpen,
  variant = 'default'
}: {
  results: PriceSearchResult[];
  loading: boolean;
  error: string | null;
  onOpen: (slug: string) => void;
  variant?: 'default' | 'compact';
}) {
  if (loading) return <p className="muted">Checking retailer prices...</p>;
  if (error) return <p className="disclaimer">{error}</p>;
  if (results.length === 0) {
    return <EmptyState title="No price matches yet" body="Search an exact cat food name, brand, or formula to compare retailer offers." />;
  }

  return (
    <div className={`price-results-grid ${variant === 'compact' ? 'compact' : ''}`}>
      {results.map((result) => (
        <PriceSummaryCard key={result.slug} onOpen={onOpen} result={result} variant={variant} />
      ))}
    </div>
  );
}

function ConditionalPriceBadge({ offer }: { offer: RetailOffer }) {
  if (!offer.conditional_best_price) return null;
  return (
    <span className="conditional-price-badge">
      Conditional {formatMoney(offer.conditional_best_price, offer.currency)}
      {offer.conditional_price_reason ? ` · ${offer.conditional_price_reason}` : ''}
    </span>
  );
}

function StockStatusBadge({ status }: { status: RetailOffer['stock_status'] }) {
  return <span className={`stock-status stock-${status.toLowerCase().replace(/_/g, '-')}`}>{status.replace(/_/g, ' ')}</span>;
}

function LastCheckedLabel({ value }: { value: string }) {
  return <span className="last-checked">{getLastCheckedDisplay([value])}</span>;
}

function RetailOfferTable({ offers, currency }: { offers: RetailOffer[]; currency: string }) {
  if (offers.length === 0) return <EmptyState title="No retailer offers" body="This product has no retailer offers for the selected market yet." />;

  return (
    <div className="compare-table-wrap retail-offer-table-wrap">
      <table className="compare-table retail-offer-table">
        <thead>
          <tr>
            <th>Retailer</th>
            <th>Best available price</th>
            <th>Unit price</th>
            <th>Stock</th>
            <th>Deal notes</th>
            <th>Buy</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr className={offer.stock_status === 'OUT_OF_STOCK' ? 'offer-row out-of-stock' : 'offer-row'} key={`${offer.retailer_slug}-${offer.product_url}`}>
              <td>
                <strong>{offer.retailer_name}</strong>
                <span className="secondary-price-detail">Base {formatMoney(offer.base_price, currency)}</span>
              </td>
              <td>
                <strong>{formatMoney(offer.effective_price, currency)}</strong>
                <span className="secondary-price-detail">
                  {offer.sale_price ? `Sale ${formatMoney(offer.sale_price, currency)}` : 'Lowest listed price from current offers'}
                </span>
              </td>
              <td>{formatMoney(offer.unit_price_per_kg, currency)} / kg</td>
              <td><StockStatusBadge status={offer.stock_status} /></td>
              <td>
                <div className="deal-note-stack">
                  {offer.promotion_text && <span>{offer.promotion_text}</span>}
                  {offer.member_price && <span className="condition-note">Member {formatMoney(offer.member_price, currency)} · Requires membership</span>}
                  {offer.coupon_price && <span className="condition-note">Coupon {formatMoney(offer.coupon_price, currency)} · Requires coupon{offer.minimum_spend ? ` · Minimum spend ${formatMoney(offer.minimum_spend, currency)}` : ''}</span>}
                  <ConditionalPriceBadge offer={offer} />
                  <LastCheckedLabel value={offer.last_checked_at} />
                </div>
              </td>
              <td>
                <a className="secondary-button compact-link" href={offer.product_url} target="_blank" rel="noreferrer">
                  Visit
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductCard({
  product,
  insight,
  isCompared,
  onAddCompare,
  onNavigate
}: {
  product: Product;
  insight?: ProductInsight;
  isCompared: boolean;
  onAddCompare: (slug: string) => void;
  onNavigate: (path: string) => void;
}) {
  const primaryPrice = getPrimaryPrice(product);

  return (
    <article className="product-card">
      <button className="product-image" onClick={() => onNavigate(`/product/${product.slug}`)} type="button" aria-label={`Open ${product.name}`}>
        <span className="product-bag-label">{product.species === 'Cat' ? 'CAT' : 'DOG'}</span>
        <img alt={product.name} className="product-packshot" src={getProductPlaceholderImage(product)} />
      </button>
      <div className="card-body">
        <div className="card-topline">
          <TrustBadge grade={product.verificationGrade} />
          <span>{product.marketAvailability}</span>
        </div>
        <button className="text-link product-title" onClick={() => onNavigate(`/product/${product.slug}`)} type="button">
          {product.name}
        </button>
        <button className="text-link brand-name" onClick={() => onNavigate(`/brand/${product.brandSlug}`)} type="button">
          {product.brand}
        </button>
        <p className="card-verdict">{insight ? insight.quick_verdict : 'Loading backend insight...'}</p>
        <div className="tag-cloud compact">
          {(insight?.best_for.slice(0, 2) || product.suitability.slice(0, 2)).map((tag) => (
            <IngredientTag key={tag} label={tag} />
          ))}
          <IngredientTag label={product.verificationGrade === 'GOLD' ? 'Strong Verification' : 'Trusted Read'} />
        </div>
        <div className="product-meta">
          <span>${primaryPrice.unitPriceKg.toFixed(2)} / kg</span>
          <span>{product.lifeStage}</span>
          <span>{product.confidence}% confidence</span>
        </div>
        <details className="product-evidence">
          <summary>Show evidence</summary>
          <div className="metric-strip">
            <NutritionCard label="Protein" value={product.nutrition.protein} suffix="%" />
            <NutritionCard label="Fat" value={product.nutrition.fat} suffix="%" />
            <NutritionCard label="Confidence" value={product.confidence} suffix="%" />
          </div>
        </details>
        <button className={isCompared ? 'secondary-button active' : 'secondary-button'} onClick={() => onAddCompare(product.slug)} type="button">
          {isCompared ? 'Added to Compare' : 'Add to Compare'}
        </button>
      </div>
    </article>
  );
}

function LandingPage({
  filters,
  setFilters,
  catalogProducts,
  markets,
  selectedMarket,
  setSelectedMarket,
  homepagePreviewResults,
  homepagePreviewLoading,
  homepagePreviewError,
  insightsByProductId,
  contextDemo,
  compareIds,
  onAddCompare,
  navigate
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  catalogProducts: Product[];
  markets: MarketConfig[];
  selectedMarket: MarketRegion;
  setSelectedMarket: (market: MarketRegion) => void;
  homepagePreviewResults: PriceSearchResult[];
  homepagePreviewLoading: boolean;
  homepagePreviewError: string | null;
  insightsByProductId: Record<string, ProductInsight>;
  contextDemo: RecommendationContext | null;
  compareIds: string[];
  onAddCompare: (slug: string) => void;
  navigate: (path: string) => void;
}) {
  const homepagePricePreviewResults = [...homepagePreviewResults]
    .filter((result) => result.offer_count > 0)
    .sort((left, right) => {
      if (right.offer_count !== left.offer_count) return right.offer_count - left.offer_count;
      if ((right.lowest_effective_price ?? -1) !== (left.lowest_effective_price ?? -1)) {
        return (right.lowest_effective_price ?? Number.POSITIVE_INFINITY) - (left.lowest_effective_price ?? Number.POSITIVE_INFINITY);
      }
      return left.product_name.localeCompare(right.product_name);
    })
    .slice(0, 3);

  return (
    <main className="page-stack landing-page">
      <section className="hero-journal">
        <div className="hero-copy-stack">
          <p className="eyebrow">AU Cat Food Price Checks</p>
          <h1>
            <span>Compare Cat Food Prices</span>
            <span>in Australia</span>
          </h1>
          <p className="hero-copy">Find the best retailer price we currently track for the exact cat food you already buy.</p>
          <MarketSelector markets={markets} selectedMarket={selectedMarket} onSelect={setSelectedMarket} />
          <ProductSearchBox
            keyword={filters.keyword}
            onKeywordChange={(keyword) => setFilters({ ...filters, keyword })}
            onSubmit={() => navigate('/search')}
          />
          <div className="hero-example-row" aria-label="Example searches">
            {priceSearchExamples.map((example) => (
              <button key={example} onClick={() => setFilters({ ...filters, keyword: example })} type="button">
                {example}
              </button>
            ))}
          </div>
        </div>
        <div className="hero-illustration-card">
          <div className="hero-illustration-stage">
            <div className="hero-mascot-bubble">
              <strong>I'm Pawkawa!</strong>
              <span>I check the data so you can choose with confidence.</span>
            </div>
            <div className="hero-illustration-placeholder">
              <img
                alt="Pawkawa cat hero artwork"
                src="/reference/pawkawa-hero-reference-v2.png"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-grid">
        <div className="landing-main-column">
          <section className="panel price-search-panel" aria-label="Retailer price matches">
            <SectionHeader eyebrow="Tracked Price Examples" title="Recent price matches worth previewing first." />
            <p className="body-copy">Examples from currently tracked retailers.</p>
            {homepagePricePreviewResults.length > 0 ? (
              <PriceSearchResults
                error={homepagePreviewError}
                loading={homepagePreviewLoading}
                onOpen={(slug) => navigate(`/price/${slug}`)}
                results={homepagePricePreviewResults}
                variant="compact"
              />
            ) : (
              <div className="homepage-price-fallback">
                <strong>Search a cat food to check currently tracked retailer prices.</strong>
                <p>Examples will appear here when tracked retailer offers are available.</p>
                <button className="primary-button" onClick={() => navigate('/search')} type="button">
                  Go to Find Prices
                </button>
              </div>
            )}
          </section>

          <section className="need-journal" aria-label="Next steps after price check">
            <div className="section-heading">
              <p className="eyebrow">After Price Checks</p>
              <h2>Choose your next step instead of guessing where to go.</h2>
              <p className="body-copy">Once you know where to buy, these secondary sections explain product context, source methods and comparison caveats without pretending coverage is complete.</p>
            </div>
            <div className="need-tile-grid">
              {homeNextSteps.map((step) => (
                <button className="need-tile" key={step.title} onClick={() => navigate(step.href)} type="button">
                  <span className="need-icon" aria-hidden="true">→</span>
                  <strong>{step.title}</strong>
                  <small>{step.note}</small>
                  <span className="next-step-link">{step.actionLabel}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="landing-side-column">
          <section className="mascot-status-card">
            <div className="section-heading compact">
              <h3 className="working-title">Pawkawa is working...</h3>
            </div>
            <div className="mascot-status-layout">
              <div className="mascot-doodle-slot">
                <img alt="Pawkawa mascot working illustration" src="/reference/pawkawa-working-cat.png" />
              </div>
              <ul className="status-list">
                {mascotStatuses.map((status, index) => (
                  <li key={status}>
                    <span className={`status-dot status-${index + 1}`} />
                    {status}
                  </li>
                ))}
              </ul>
            </div>
            <p className="muted">Last updated: just now</p>
          </section>

          <section className="trust-story-card">
            <SectionHeader eyebrow="Why pet parents trust Pawkawa" title="Professional backend. Friendly frontend." />
            <div className="trust-story-list">
              {trustReasons.map((reason) => (
                <article key={reason.title}>
                  <strong>{reason.title}</strong>
                  <p>{reason.body}</p>
                </article>
              ))}
            </div>
            <div className="trust-cat-footer">
              <img alt="Pawkawa cat with pink heart doodles" src="/reference/pawkawa-footer-cat-hearts.png" />
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function LearnPage({ navigate }: { navigate: (path: string) => void }) {
  return (
    <main className="page-stack">
      <section className="hero-journal learn-journal">
        <div className="hero-copy-stack learn-copy-stack">
          <button className="secondary-button support-back-button" onClick={() => navigate('/')} type="button">
            Back to Home
          </button>
          <p className="eyebrow">Learn</p>
          <h1>
            <span>Understand how Pawkawa</span>
            <span>explains price checks</span>
          </h1>
          <p className="hero-copy">Cross-check first. Learn pages explain how tracked price checks, offer rules and source limits work before broader claims.</p>
        </div>
        <div className="hero-illustration-card learn-illustration-card">
          <div className="hero-illustration-stage">
            <div className="hero-illustration-placeholder learn-illustration-placeholder">
              <img alt="Pawkawa learn mascot illustration" src="/reference/pawkawa-learn-mascot.png" />
            </div>
          </div>
        </div>
      </section>

      <section className="two-column">
        {learnTopics.map((topic) => (
          <article className="panel" key={topic.title}>
            <SectionHeader eyebrow="Price Check Guide" title={topic.title} />
            <p className="body-copy">{topic.body}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Content Standard" title="How future Learn articles should be published" />
        <ul className="plain-list">
          <li>Collect information from more than one source category, not a single article.</li>
          <li>Check for agreement across retailers, brand pages and general pet guidance sources.</li>
          <li>Rewrite in plain language with restrained claims and clear safety boundaries.</li>
          <li>Keep veterinary treatment advice out of general educational copy.</li>
        </ul>
      </section>
    </main>
  );
}

function AboutPage({ navigate }: { navigate: (path: string) => void }) {
  return (
    <main className="page-stack">
      <section className="support-hero support-hero-compact">
        <div className="support-hero-copy">
          <button className="secondary-button support-back-button" onClick={() => navigate('/')} type="button">
            Back to Home
          </button>
          <p className="eyebrow">About</p>
          <h1>How Pawkawa keeps price comparison honest.</h1>
          <p className="body-copy">Pawkawa is AU-first and compares currently tracked retailer offers. We show limits, conditions and source freshness so users can understand what the result does and does not cover.</p>
        </div>
        <div className="support-hero-note about-hero-note">
          <strong>AU-first. Tracked retailers only.</strong>
          <span>About should explain sources, confidence rules, conditional price handling and where current coverage still stops.</span>
        </div>
      </section>

      <section className="two-column">
        {aboutMethodSections.map((section) => (
          <article className="panel" key={section.title}>
            <SectionHeader eyebrow="Method" title={section.title} />
            <ul className="plain-list">
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Confidence Principle" title="Why restrained wording improves credibility" />
        <p className="body-copy">Pawkawa should describe the best price found from tracked retailers, not claim to know the cheapest price in Australia. Conditional prices stay separate, limited coverage is visible, and every product page should make clear how many current retailer checks support the result.</p>
      </section>
    </main>
  );
}

function SearchPage({
  filters,
  setFilters,
  markets,
  selectedMarket,
  setSelectedMarket,
  priceResults,
  priceSearchLoading,
  priceSearchError,
  results,
  insightsByProductId,
  compareIds,
  onAddCompare,
  navigate
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  markets: MarketConfig[];
  selectedMarket: MarketRegion;
  setSelectedMarket: (market: MarketRegion) => void;
  priceResults: PriceSearchResult[];
  priceSearchLoading: boolean;
  priceSearchError: string | null;
  results: Product[];
  insightsByProductId: Record<string, ProductInsight>;
  compareIds: string[];
  onAddCompare: (slug: string) => void;
  navigate: (path: string) => void;
}) {
  return (
    <main className="search-layout">
      <aside className="filter-panel">
        <div className="section-heading">
          <p className="eyebrow">Search</p>
          <h1>Find the exact cat food, then compare retailer prices.</h1>
          <p className="body-copy">Pawkawa groups tracked retailer listings under one product so you can check price, stock, promotions and unit cost first.</p>
        </div>
        <MarketSelector markets={markets} selectedMarket={selectedMarket} onSelect={setSelectedMarket} />
        <div className="filter-grid">
          <label className="field">
            <span>Exact food search</span>
            <input value={filters.keyword} onChange={(event) => setFilters({ ...filters, keyword: event.target.value })} placeholder="brand, product, ingredient" />
          </label>
          <label className="field">
            <span>Species</span>
            <select value={filters.species} onChange={(event) => setFilters({ ...filters, species: event.target.value as Filters['species'] })}>
              {speciesOptions.map((species) => (
                <option key={species}>{species}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Life stage</span>
            <select value={filters.lifeStage} onChange={(event) => setFilters({ ...filters, lifeStage: event.target.value as Filters['lifeStage'] })}>
              {lifeStageOptions.map((stage) => (
                <option key={stage}>{stage}</option>
              ))}
            </select>
          </label>
        </div>
        <details className="advanced-panel">
          <summary>Optional filters</summary>
          <div className="filter-grid">
            <label className="field">
              <span>Brand</span>
              <select value={filters.brand} onChange={(event) => setFilters({ ...filters, brand: event.target.value })}>
                <option>All Brands</option>
                {brands.map((brand) => (
                  <option key={brand.slug}>{brand.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Verification grade</span>
              <select value={filters.grade} onChange={(event) => setFilters({ ...filters, grade: event.target.value as Filters['grade'] })}>
                {gradeOptions.map((grade) => (
                  <option key={grade}>{grade}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Max price/kg: ${filters.maxPrice}</span>
              <input min="10" max="180" onChange={(event) => setFilters({ ...filters, maxPrice: Number(event.target.value) })} type="range" value={filters.maxPrice} />
            </label>
          </div>
        </details>
        <button className="secondary-button" onClick={() => setFilters(defaultFilters)} type="button">
          Clear filters
        </button>
      </aside>

      <section className="results-panel">
        <div className="search-intro-card">
          <div>
            <p className="eyebrow">Price-first Search</p>
            <h2>Start with the exact product, then compare tracked offers.</h2>
            <p className="body-copy">Results prioritize current offer price, unit price, stock and retailer coverage. Nutrition context stays secondary.</p>
          </div>
          <div className="search-illustration-slot">
            <span>Tracked source status</span>
            <small>Petstock + Petbarn are live in the MVP. More retailers need QA before public claims.</small>
          </div>
        </div>
        <section className="panel price-search-panel">
          <SectionHeader eyebrow="Tracked Retailer Offers" title="Available offers we currently track" />
          <PriceSearchResults
            error={priceSearchError}
            loading={priceSearchLoading}
            onOpen={(slug) => navigate(`/price/${slug}`)}
            results={priceResults}
          />
        </section>

        <div className="summary-strip">
          <span>Product context below: {results.length} products</span>
          <span>Average confidence {getAverageConfidence(results)}%</span>
          <span>{results.filter((product) => product.verificationGrade !== 'UNVERIFIED').length} verified products</span>
        </div>

        {results.length === 0 ? (
          <EmptyState title="No products found" body="Clear filters or broaden your keyword to see more products." />
        ) : (
          <div className="product-grid">
            {results.map((product) => (
              <ProductCard
                isCompared={compareIds.includes(product.slug)}
                insight={insightsByProductId[product.id]}
                key={product.id}
                onAddCompare={onAddCompare}
                onNavigate={navigate}
                product={product}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ProductDetailPage({ product, insight, navigate, onAddCompare, isCompared }: { product: Product; insight?: ProductInsight; navigate: (path: string) => void; onAddCompare: (slug: string) => void; isCompared: boolean }) {
  const primaryPrice = getPrimaryPrice(product);

  return (
    <main className="page-stack">
      <section className="detail-header">
        <button className="secondary-button" onClick={() => navigate('/search')} type="button">
          Back to Search
        </button>
        <div>
          <p className="eyebrow">Product Profile</p>
          <h1>{product.name}</h1>
          <button className="text-link brand-name" onClick={() => navigate(`/brand/${product.brandSlug}`)} type="button">
            {product.brand}
          </button>
          <div className="product-meta large">
            <span>{product.species}</span>
            <span>{product.lifeStage}</span>
            <TrustBadge grade={product.verificationGrade} />
            <span>{product.marketAvailability}</span>
          </div>
        </div>
        <button className={isCompared ? 'primary-button active' : 'primary-button'} onClick={() => onAddCompare(product.slug)} type="button">
          {isCompared ? 'In Compare' : 'Add to Compare'}
        </button>
      </section>

      <section className="verdict-panel">
        <div>
          <p className="eyebrow">Plain-English Read</p>
          <h2>Quick verdict</h2>
          <p>{insight?.quick_verdict || 'Loading backend product insight...'}</p>
        </div>
        <ConfidenceMeter score={product.confidence} />
      </section>

      <section className="insight-grid">
        <article className="panel">
          <SectionHeader eyebrow="Strengths" title="What stands out" />
          <InsightList items={insight?.strengths || []} empty="No major strengths generated yet." />
        </article>
        <article className="panel">
          <SectionHeader eyebrow="Considerations" title="Check before buying" />
          <InsightList items={insight?.considerations || []} empty="No major considerations found." />
        </article>
        <article className="panel">
          <SectionHeader eyebrow="Best For" title="Likely fit" />
          <InsightList items={insight?.best_for || []} empty="No fit tags generated yet." />
        </article>
        <article className="panel">
          <SectionHeader eyebrow="Avoid If" title="Use caution" />
          <InsightList items={insight?.avoid_if || []} empty="No avoid-if notes generated yet." />
        </article>
      </section>

      <section className="nutrition-grid">
        <NutritionCard label="Protein" value={product.nutrition.protein} suffix="%" />
        <NutritionCard label="Fat" value={product.nutrition.fat} suffix="%" />
        <NutritionCard label="Fiber" value={product.nutrition.fiber} suffix="%" />
        <NutritionCard label="Calories" value={product.nutrition.calories} suffix=" kcal/kg" />
        <NutritionCard label="Moisture" value={product.nutrition.moisture} suffix="%" />
        <NutritionCard label="Price/kg" value={`$${primaryPrice.unitPriceKg.toFixed(2)}`} />
      </section>

      <section className="two-column">
        <article className="panel">
          <SectionHeader eyebrow="Trust" title="Why this data is reliable" />
          <ConfidenceMeter score={product.confidence} />
          <p className="body-copy">Checked against {product.verifiedSources} verified sources. Current status: {product.conflictStatus.toLowerCase()}.</p>
        </article>

        <article className="panel">
          <SectionHeader eyebrow="Suitability" title="Best-fit tags" />
          <div className="tag-cloud">
            {product.suitability.map((tag) => (
              <IngredientTag key={tag} label={tag} />
            ))}
          </div>
        </article>
      </section>

      <details className="evidence-panel">
        <summary>Show full ingredients, price sources and nutrition table</summary>
        <section className="panel">
          <SectionHeader eyebrow="Verification Details" title="Source confidence breakdown" />
          <div className="definition-list">
            <span>Source count</span>
            <strong>{product.sourceCount}</strong>
            <span>Verified sources</span>
            <strong>{product.verifiedSources}</strong>
            <span>Last checked</span>
            <strong>{product.lastChecked}</strong>
            <span>Conflict status</span>
            <strong>{product.conflictStatus}</strong>
          </div>
        </section>

        <section className="panel">
          <SectionHeader eyebrow="Ingredients" title="Raw and normalized ingredient readout" />
          <p className="body-copy">{product.ingredientsRaw}</p>
          <div className="tag-cloud">
            {product.ingredientsNormalized.map((ingredient) => (
              <IngredientTag key={ingredient} label={ingredient} />
            ))}
            {product.controversialIngredients.map((ingredient) => (
              <IngredientTag key={ingredient} label={ingredient} warning />
            ))}
          </div>
        </section>

        <section className="panel">
          <SectionHeader eyebrow="Price Sources" title="Retailer and unit price checks" />
          <div className="price-grid">
            {product.prices.map((price) => (
              <PriceCard key={`${price.retailer}-${price.packSize}`} price={price} />
            ))}
          </div>
        </section>

        <section className="panel">
          <SectionHeader eyebrow="Nutrition Details" title="Full table" />
          <table className="data-table">
            <tbody>
              {Object.entries(product.nutrition).map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </details>

      <p className="disclaimer">This information is for general comparison only and is not veterinary advice.</p>
    </main>
  );
}

function PriceDetailPage({
  detail,
  loading,
  error,
  selectedMarket,
  markets,
  setSelectedMarket,
  navigate
}: {
  detail: PriceComparisonResponse | null;
  loading: boolean;
  error: string | null;
  selectedMarket: MarketRegion;
  markets: MarketConfig[];
  setSelectedMarket: (market: MarketRegion) => void;
  navigate: (path: string) => void;
}) {
  if (loading) {
    return (
      <main className="page-stack">
        <p className="muted">Loading retailer price comparison...</p>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="page-stack">
        <EmptyState title="Price comparison not found" body={error || 'This product does not have a price comparison page yet.'} />
        <button className="primary-button" onClick={() => navigate('/search')} type="button">Back to Search</button>
      </main>
    );
  }

  const { product, currency } = detail;
  const trackedRetailerCount = getTrackedRetailerCount(detail.offers);
  const coverage = getCoverageStatus(trackedRetailerCount);
  const lastCheckedLabel = getLastCheckedDisplay(detail.offers.map((offer) => offer.last_checked_at));
  const buyableOfferCount = detail.offers.filter((offer) => offer.stock_status !== 'OUT_OF_STOCK').length;
  const trackedRetailersLabel = getTrackedRetailersLabel(trackedRetailerCount);
  const trackedRetailersNote = getCurrentTrackedRetailersNote(detail.offers);

  return (
    <main className="page-stack price-detail-page">
      <section className="detail-header price-detail-header">
        <button className="secondary-button" onClick={() => navigate('/search')} type="button">
          Back to Search
        </button>
        <div>
          <p className="eyebrow">Where to Buy</p>
          <h1>{product.brand_name} {product.product_name}</h1>
          <div className="product-meta large">
            <span>{formatPackSize(product.pack_size_g)}</span>
            <span>{detail.market === 'AU' ? 'Australia' : 'New Zealand'} · {detail.currency}</span>
            <span>{trackedRetailersLabel}</span>
            <span className={`coverage-badge coverage-${coverage.tone}`}>{coverage.heading}</span>
          </div>
        </div>
        <MarketSelector markets={markets} selectedMarket={selectedMarket} onSelect={setSelectedMarket} />
      </section>

      <section className="price-hero-grid">
        <article className="price-hero-card best-price-card">
          <p className="eyebrow">Best price found from tracked retailers</p>
          <strong>{formatMoney(detail.best_price_today, currency)}</strong>
          <span>{detail.best_retailer ? `Best at ${detail.best_retailer}` : 'No in-stock offer yet'}</span>
          <small>{trackedRetailersNote}</small>
        </article>
        <article className="price-hero-card">
          <p className="eyebrow">Coverage and last checked</p>
          <strong>{coverage.heading}</strong>
          <span>{coverage.detail}</span>
          <small>{lastCheckedLabel}</small>
        </article>
        <article className="price-hero-card">
          <p className="eyebrow">Unit price and stock</p>
          <strong>{detail.lowest_unit_price_per_kg ? `${formatMoney(detail.lowest_unit_price_per_kg, currency)} / kg` : '-'}</strong>
          <span>{buyableOfferCount} buyable offer{buyableOfferCount === 1 ? '' : 's'} right now</span>
          <small>Member and coupon prices stay separate when conditions apply.</small>
        </article>
      </section>

      {detail.offers.length === 0 && (
        <section className="panel low-data-panel">
          <strong>No tracked offers yet</strong>
          <p>We do not have tracked retailer offers for this product yet.</p>
        </section>
      )}

      {trackedRetailerCount === 1 && detail.offers.length > 0 && (
        <section className="panel low-data-panel">
          <strong>Limited coverage</strong>
          <p>This product currently has limited coverage. We are tracking 1 retailer.</p>
        </section>
      )}

      <section className="panel">
        <SectionHeader eyebrow="Retailer Offers" title="Compare effective prices, conditional deals and stock" />
        <p className="best-price-note">Best available price uses current non-conditional offers. Member and coupon prices are shown separately when conditions apply.</p>
        <p className="trust-copy">Prices are based on currently tracked retailers and may change. Membership, coupon, or minimum-spend offers are shown separately when detected.</p>
        <RetailOfferTable offers={detail.offers} currency={currency} />
      </section>

      <section className="two-column">
        <article className="panel">
          <SectionHeader eyebrow="Nutrition" title="Secondary nutrition context" />
          {detail.secondary.nutrition ? (
            <div className="nutrition-grid compact-nutrition">
              <NutritionCard label="Protein" value={detail.secondary.nutrition.protein} suffix="%" />
              <NutritionCard label="Fat" value={detail.secondary.nutrition.fat} suffix="%" />
              <NutritionCard label="Fiber" value={detail.secondary.nutrition.fiber} suffix="%" />
              <NutritionCard label="Calories" value={detail.secondary.nutrition.calories} suffix=" kcal/kg" />
            </div>
          ) : (
            <p className="muted">Nutrition profile is not available yet.</p>
          )}
        </article>

        <article className="panel">
          <SectionHeader eyebrow="Suitability" title="Secondary guidance" />
          <div className="tag-cloud">
            {detail.secondary.suitability.length > 0 ? detail.secondary.suitability.map((tag) => <IngredientTag key={tag} label={tag} />) : <span className="muted">No suitability tags yet.</span>}
          </div>
        </article>
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Ingredients" title="Ingredient context" />
        <div className="tag-cloud">
          {detail.secondary.ingredients.length > 0 ? detail.secondary.ingredients.map((ingredient) => <IngredientTag key={ingredient} label={ingredient} />) : <span className="muted">No ingredient details yet.</span>}
        </div>
      </section>

      <p className="disclaimer">Prices and promotions can change. Conditional prices may require membership, coupon codes, or minimum spend. Nutrition information is for comparison only and is not veterinary advice.</p>
    </main>
  );
}

function BrandPage({
  brandSlug,
  catalogProducts,
  insightsByProductId,
  navigate,
  onAddCompare,
  compareIds
}: {
  brandSlug: string;
  catalogProducts: Product[];
  insightsByProductId: Record<string, ProductInsight>;
  navigate: (path: string) => void;
  onAddCompare: (slug: string) => void;
  compareIds: string[];
}) {
  const brand = brands.find((item) => item.slug === brandSlug);
  const brandProducts = catalogProducts.filter((product) => product.brandSlug === brandSlug);

  if (!brand) {
    return <MissingPage navigate={navigate} />;
  }

  return (
    <main className="page-stack">
      <section className="detail-header">
        <button className="secondary-button" onClick={() => navigate('/search')} type="button">
          Back to Search
        </button>
        <div>
          <p className="eyebrow">Brand Profile</p>
          <h1>{brand.name}</h1>
          <div className="product-meta large">
            <span>{brand.country}</span>
            <a href={brand.website} target="_blank" rel="noreferrer">
              Official website
            </a>
            <span>{brandProducts.length} products</span>
            <span>Avg confidence {getAverageConfidence(brandProducts)}%</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Brand Data Quality" title="Coverage and verification" />
        <div className="summary-strip">
          <span>{brandProducts.filter((product) => product.verificationGrade !== 'UNVERIFIED').length} verified products</span>
          <span>Average confidence {getAverageConfidence(brandProducts)}%</span>
          <span>{brandProducts.reduce((sum, product) => sum + product.sourceCount, 0)} total source checks</span>
        </div>
      </section>

      <div className="product-grid">
        {brandProducts.map((product) => (
          <ProductCard
            isCompared={compareIds.includes(product.slug)}
            insight={insightsByProductId[product.id]}
            key={product.id}
            onAddCompare={onAddCompare}
            onNavigate={navigate}
            product={product}
          />
        ))}
      </div>
    </main>
  );
}

function MissingPage({ navigate }: { navigate: (path: string) => void }) {
  return (
    <main className="page-stack">
      <EmptyState title="Page not found" body="This product or brand does not exist in the current prototype data." />
      <button className="primary-button" onClick={() => navigate('/search')} type="button">
        Go to Search
      </button>
    </main>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const [insightsByProductId, setInsightsByProductId] = useState<Record<string, ProductInsight>>({});
  const [verifiedProductItems, setVerifiedProductItems] = useState<VerifiedProductListItem[]>([]);
  const [verifiedProductDetailsBySlug, setVerifiedProductDetailsBySlug] = useState<Record<string, VerifiedProductDetailResponse>>({});
  const [markets, setMarkets] = useState<MarketConfig[]>([
    { market: 'AU', currency: 'AUD', enabled: true, default_retailers: [], status: 'ENABLED' },
    { market: 'NZ', currency: 'NZD', enabled: false, default_retailers: [], status: 'PENDING' }
  ]);
  const [selectedMarket, setSelectedMarket] = useState<MarketRegion>('AU');
  const [priceResults, setPriceResults] = useState<PriceSearchResult[]>([]);
  const [priceSearchLoading, setPriceSearchLoading] = useState(false);
  const [priceSearchError, setPriceSearchError] = useState<string | null>(null);
  const [homepagePreviewResults, setHomepagePreviewResults] = useState<PriceSearchResult[]>([]);
  const [homepagePreviewLoading, setHomepagePreviewLoading] = useState(false);
  const [homepagePreviewError, setHomepagePreviewError] = useState<string | null>(null);
  const [priceDetailsByKey, setPriceDetailsByKey] = useState<Record<string, PriceComparisonResponse>>({});
  const [priceDetailLoading, setPriceDetailLoading] = useState(false);
  const [priceDetailError, setPriceDetailError] = useState<string | null>(null);
  const [contextDemo, setContextDemo] = useState<RecommendationContext | null>(null);
  const [compareCatalog, setCompareCatalog] = useState<ProductListResponse['items']>([]);
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [compareRecommendations, setCompareRecommendations] = useState<CompareRecommendationResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (event.persisted || navigation?.type === 'back_forward') {
        window.location.reload();
      }
    };

    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  useEffect(() => {
    let cancelled = false;

    readApi<MarketsResponse>('/api/markets')
      .then((data) => {
        if (cancelled) return;
        setMarkets(data.markets);
        const defaultMarket = data.markets.find((market) => market.market === data.default_market && market.enabled);
        if (defaultMarket) setSelectedMarket(defaultMarket.market);
      })
      .catch((error) => {
        console.warn(error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadIntelligence() {
      const [verifiedList, contextData] = await Promise.all([
        readApi<VerifiedProductListResponse>('/api/verified-products?species=CAT&pageSize=100'),
        readApi<RecommendationContext>('/api/intelligence/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ species: 'CAT', age_years: 3, breed: 'RAGDOLL', health_conditions: ['GI_SENSITIVE'] })
        })
      ]);

      if (cancelled) return;
      setVerifiedProductItems(verifiedList.items);
      setInsightsByProductId(Object.fromEntries(verifiedList.items.map((item) => [item.product_id, toInsightFromVerified(item)])));
      setContextDemo(contextData);
      const catCatalog = verifiedList.items.map((item) => ({
        product_id: item.product_id,
        name: item.product_name,
        slug: item.slug,
        brand_name: item.brand_name,
        species: item.species,
        life_stage: item.life_stage,
        confidence: item.confidence,
        trust_grade: item.trust_grade
      }));
      setCompareCatalog(catCatalog);
      setCompareSlugs((current) => (current.length > 0 ? current.filter((slug) => catCatalog.some((item) => item.slug === slug)) : catCatalog.slice(0, 2).map((item) => item.slug)));
    }

    loadIntelligence().catch((error) => {
      console.warn(error);
      if (cancelled) return;
      const fallbackCatalog = catProducts.map((product) => ({
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        brand_name: product.brand,
        species: 'CAT' as const,
        life_stage: product.lifeStage.toUpperCase().replace(/ /g, '_'),
        confidence: product.confidence,
        trust_grade: product.verificationGrade
      }));
      setCompareCatalog(fallbackCatalog);
      setCompareSlugs((current) => (current.length > 0 ? current.filter((slug) => fallbackCatalog.some((item) => item.slug === slug)) : fallbackCatalog.slice(0, 2).map((item) => item.slug)));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (route.name !== 'product' || !route.slug || verifiedProductDetailsBySlug[route.slug]) return;

    let cancelled = false;

    readApi<VerifiedProductDetailResponse>(`/api/verified-products/${route.slug}`)
      .then((detail) => {
        if (cancelled) return;
        setVerifiedProductDetailsBySlug((current) => ({ ...current, [route.slug as string]: detail }));
        const listItem = verifiedProductItems.find((item) => item.slug === route.slug);
        if (listItem) {
          setInsightsByProductId((current) => ({ ...current, [listItem.product_id]: toInsightFromVerified(listItem, detail) }));
        }
      })
      .catch((error) => {
        console.warn(error);
      });

    return () => {
      cancelled = true;
    };
  }, [route.name, route.slug, verifiedProductDetailsBySlug, verifiedProductItems]);

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    setRoute(parseRoute(path));
    window.scrollTo({ top: 0 });
  }

  useEffect(() => {
    const selectedMarketConfig = markets.find((market) => market.market === selectedMarket);
    if (selectedMarketConfig && !selectedMarketConfig.enabled) {
      setHomepagePreviewResults([]);
      setHomepagePreviewError(`${selectedMarket} pricing is coming soon.`);
      setHomepagePreviewLoading(false);
      return;
    }

    let cancelled = false;
    setHomepagePreviewLoading(true);
    setHomepagePreviewError(null);

    Promise.allSettled(
      homepagePreviewSlugs.map((slug) => readApi<PriceComparisonResponse>(`/api/price-comparison/${slug}?market=${selectedMarket}`))
    )
      .then((responses) => {
        if (cancelled) return;

        const items = responses
          .filter((response): response is PromiseFulfilledResult<PriceComparisonResponse> => response.status === 'fulfilled')
          .map(({ value }) => ({
            product_id: value.product.product_id,
            slug: value.product.slug,
            product_name: value.product.product_name,
            brand_name: value.product.brand_name,
            primary_image_url: getRetailOfferImageUrl(value.offers) || value.product.primary_image_url,
            pack_sizes: [value.product.pack_size_g],
            lowest_effective_price: value.best_price_today,
            lowest_unit_price_per_kg: value.lowest_unit_price_per_kg,
            best_retailer: value.best_retailer,
            offer_count: value.offer_count,
            market: value.market,
            currency: value.currency
          }))
          .filter((item) => item.offer_count > 0);

        setHomepagePreviewResults(items);
        setHomepagePreviewLoading(false);
      })
      .catch((error) => {
        console.warn(error);
        if (cancelled) return;
        setHomepagePreviewError('Homepage price previews are not available right now.');
        setHomepagePreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [markets, selectedMarket]);

  useEffect(() => {
    const selectedMarketConfig = markets.find((market) => market.market === selectedMarket);
    if (selectedMarketConfig && !selectedMarketConfig.enabled) {
      setPriceResults([]);
      setPriceSearchError(`${selectedMarket} pricing is coming soon.`);
      setPriceSearchLoading(false);
      return;
    }

    let cancelled = false;
    const keyword = filters.keyword.trim();
    const query = keyword || 'cat food';

    setPriceSearchLoading(true);
    setPriceSearchError(null);

    readApi<PriceSearchResponse>(`/api/search/products?q=${encodeURIComponent(query)}&market=${selectedMarket}`)
      .then((data) => {
        if (cancelled) return;
        setPriceResults(data.items);
        setPriceSearchLoading(false);
      })
      .catch((error) => {
        console.warn(error);
        if (cancelled) return;
        setPriceSearchError('Retailer price search is not available right now.');
        setPriceSearchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.keyword, markets, selectedMarket]);

  useEffect(() => {
    if (route.name !== 'price' || !route.slug) return;
    const key = `${selectedMarket}:${route.slug}`;

    const selectedMarketConfig = markets.find((market) => market.market === selectedMarket);
    if (selectedMarketConfig && !selectedMarketConfig.enabled) {
      setPriceDetailError(`${selectedMarket} pricing is coming soon.`);
      setPriceDetailLoading(false);
      return;
    }

    let cancelled = false;
    setPriceDetailLoading(!priceDetailsByKey[key]);
    setPriceDetailError(null);

    readApi<PriceComparisonResponse>(`/api/price-comparison/${route.slug}?market=${selectedMarket}`)
      .then((data) => {
        if (cancelled) return;
        setPriceDetailsByKey((current) => ({ ...current, [key]: data }));
        setPriceDetailLoading(false);
      })
      .catch((error) => {
        console.warn(error);
        if (cancelled) return;
        setPriceDetailError('This price comparison is not available yet.');
        setPriceDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [markets, priceDetailsByKey, route.name, route.slug, selectedMarket]);

  useEffect(() => {
    const availableSlugs = compareCatalog.filter((product) => compareSlugs.includes(product.slug)).map((product) => product.slug);

    if (availableSlugs.length < 2) {
      setCompareData(null);
      setCompareRecommendations(null);
      setCompareError(null);
      return;
    }

    let cancelled = false;

    async function loadCompare() {
      setCompareLoading(true);
      setCompareError(null);

      const comparison = await readApi<CompareResponse>('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_slugs: availableSlugs })
      });

      const selectedProducts = compareCatalog.filter((product) => availableSlugs.includes(product.slug));
      const speciesSet = Array.from(new Set(selectedProducts.map((product) => product.species).filter(Boolean)));
      const recommendations =
        speciesSet.length === 1 && (speciesSet[0] === 'CAT' || speciesSet[0] === 'DOG')
          ? await readApi<CompareRecommendationResponse>('/api/compare/recommend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product_slugs: availableSlugs, species: speciesSet[0], age_years: 3, health_conditions: [] })
            })
          : null;

      if (cancelled) return;
      setCompareData(comparison);
      setCompareRecommendations(recommendations);
      setCompareLoading(false);
    }

    loadCompare().catch(() => {
      if (cancelled) return;
      setCompareError('The backend comparison is not available right now.');
      setCompareLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [compareCatalog, compareSlugs]);

  function addCompare(slug: string) {
    setCompareSlugs((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      if (current.length >= 4) return [...current.slice(1), slug];
      return [...current, slug];
    });
  }

  const catalogProducts = useMemo(() => {
    return verifiedProductItems.length > 0
      ? verifiedProductItems.map((item) => toProductFromVerified(item, verifiedProductDetailsBySlug[item.slug]))
      : catProducts;
  }, [verifiedProductDetailsBySlug, verifiedProductItems]);

  const results = useMemo(() => {
    return catalogProducts.filter((product) => {
      const primaryPrice = getPrimaryPrice(product);
      const text = `${product.name} ${product.brand} ${product.species} ${product.lifeStage} ${product.ingredientsNormalized.join(' ')}`.toLowerCase();
      const matchesKeyword = filters.keyword.trim().length === 0 || text.includes(filters.keyword.toLowerCase());
      const matchesBrand = filters.brand === 'All Brands' || product.brand === filters.brand;
      const matchesSpecies = filters.species === 'All Species' || product.species === filters.species;
      const matchesLifeStage =
        filters.lifeStage === 'All Life Stages' || product.lifeStage === filters.lifeStage || product.lifeStage === 'All Life Stages';
      const matchesGrade = filters.grade === 'All Grades' || product.verificationGrade === filters.grade;
      const matchesPrice = primaryPrice.unitPriceKg <= filters.maxPrice;
      return matchesKeyword && matchesBrand && matchesSpecies && matchesLifeStage && matchesGrade && matchesPrice;
    });
  }, [catalogProducts, filters]);

  const currentProduct = route.name === 'product' ? catalogProducts.find((product) => product.slug === route.slug) : undefined;
  const currentPriceDetail = route.name === 'price' && route.slug ? priceDetailsByKey[`${selectedMarket}:${route.slug}`] || null : null;
  const unavailableCompareSlugs = compareSlugs.filter((slug) => !compareCatalog.some((product) => product.slug === slug));

  if (route.name === 'adminLogin') {
    return <AdminLoginPage navigate={navigate} />;
  }

  if (route.name === 'admin') {
    return <AdminAppShell navigate={navigate} />;
  }

  return (
    <div className="app-shell">
      <AppHeader navigate={navigate} route={route.name} />
      {route.name === 'landing' && <LandingPage catalogProducts={catalogProducts} compareIds={compareSlugs} contextDemo={contextDemo} filters={filters} homepagePreviewError={homepagePreviewError} homepagePreviewLoading={homepagePreviewLoading} homepagePreviewResults={homepagePreviewResults} insightsByProductId={insightsByProductId} markets={markets} navigate={navigate} onAddCompare={addCompare} selectedMarket={selectedMarket} setFilters={setFilters} setSelectedMarket={setSelectedMarket} />}
      {route.name === 'search' && <SearchPage compareIds={compareSlugs} filters={filters} insightsByProductId={insightsByProductId} markets={markets} navigate={navigate} onAddCompare={addCompare} priceResults={priceResults} priceSearchError={priceSearchError} priceSearchLoading={priceSearchLoading} results={results} selectedMarket={selectedMarket} setFilters={setFilters} setSelectedMarket={setSelectedMarket} />}
      {route.name === 'compare' && <ComparePage compareCatalog={compareCatalog} compareData={compareData} compareError={compareError} compareLoading={compareLoading} compareRecommendations={compareRecommendations} compareSlugs={compareSlugs} navigate={navigate} onAddCompare={addCompare} unavailableCompareSlugs={unavailableCompareSlugs} />}
      {route.name === 'price' && <PriceDetailPage detail={currentPriceDetail} error={priceDetailError} loading={priceDetailLoading || (!currentPriceDetail && !priceDetailError)} markets={markets} navigate={navigate} selectedMarket={selectedMarket} setSelectedMarket={setSelectedMarket} />}
      {route.name === 'product' && (currentProduct ? <ProductDetailPage insight={insightsByProductId[currentProduct.id]} isCompared={compareSlugs.includes(currentProduct.slug)} navigate={navigate} onAddCompare={addCompare} product={currentProduct} /> : <MissingPage navigate={navigate} />)}
      {route.name === 'brand' && <BrandPage brandSlug={route.slug || ''} catalogProducts={catalogProducts} compareIds={compareSlugs} insightsByProductId={insightsByProductId} navigate={navigate} onAddCompare={addCompare} />}
      {route.name === 'learn' && <LearnPage navigate={navigate} />}
      {route.name === 'about' && <AboutPage navigate={navigate} />}
    </div>
  );
}

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
  ProductInsight,
  ProductListResponse,
  RecommendationContext,
  RecoveryTopic
} from './app-types';
import { readApi } from './api';
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
  species: 'All Species',
  lifeStage: 'All Life Stages',
  grade: 'All Grades',
  maxPrice: 180
};

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
        <span>{product.species === 'Cat' ? 'CAT' : 'DOG'}</span>
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
        <p className="card-verdict">{insight ? insight.strengths.slice(0, 2).join(' · ') || insight.quick_verdict : 'Loading backend insight...'}</p>
        <div className="product-meta">
          <span>{product.species}</span>
          <span>{product.lifeStage}</span>
          <span>${primaryPrice.unitPriceKg.toFixed(2)} / kg</span>
        </div>
        <div className="metric-strip">
          <NutritionCard label="Protein" value={product.nutrition.protein} suffix="%" />
          <NutritionCard label="Fat" value={product.nutrition.fat} suffix="%" />
          <NutritionCard label="Confidence" value={product.confidence} suffix="%" />
        </div>
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
  insightsByProductId,
  recoveryTopics,
  contextDemo,
  compareIds,
  onAddCompare,
  navigate
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  insightsByProductId: Record<string, ProductInsight>;
  recoveryTopics: RecoveryTopic[];
  contextDemo: RecommendationContext | null;
  compareIds: string[];
  onAddCompare: (slug: string) => void;
  navigate: (path: string) => void;
}) {
  const featured = products.slice(0, 6);

  return (
    <main className="page-stack landing-page">
      <section className="hero-section">
        <div>
          <p className="eyebrow">Trusted Pet Food Intelligence</p>
          <h1>Compare Pet Food Smarter</h1>
          <p className="hero-copy">Verified nutrition, price and ingredient data for Australian pet owners.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => navigate('/search')} type="button">
              Search Products
            </button>
            <button className="secondary-button" onClick={() => navigate('/compare')} type="button">
              Compare Foods
            </button>
          </div>
        </div>
        <aside className="hero-panel">
          <strong>Data quality snapshot</strong>
          <ConfidenceMeter score={getAverageConfidence(products)} />
          <div className="mini-stats">
            <span>{products.length} products</span>
            <span>{products.filter((product) => product.verificationGrade === 'GOLD').length} gold verified</span>
          </div>
          <LivingCat />
        </aside>
      </section>

      <section className="trust-grid" aria-label="Trust highlights">
        {['Verified product data', 'Multi-source checking', 'Nutrition comparison', 'Australian retailers'].map((item) => (
          <div key={item}>
            <span />
            <strong>{item}</strong>
          </div>
        ))}
      </section>

      <section className="need-rail" aria-label="Browse by pet need">
        <div>
          <p className="eyebrow">Browse by Need</p>
          <h2>Start with the problem, not the label.</h2>
        </div>
        {['Digestive care', 'Weight control', 'Skin & coat', 'Puppy / kitten growth', 'Senior support', 'Vet diet caution'].map((need) => (
          <button key={need} onClick={() => navigate('/search')} type="button">
            {need}
          </button>
        ))}
      </section>

      <section className="search-entry">
        <div>
          <p className="eyebrow">Search Entry</p>
          <h2>Start with a product, species, or life stage.</h2>
        </div>
        <div className="filter-grid compact">
          <label className="field">
            <span>Search</span>
            <input value={filters.keyword} onChange={(event) => setFilters({ ...filters, keyword: event.target.value })} placeholder="Ziwi, puppy, indoor" />
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
          <button className="primary-button" onClick={() => navigate('/search')} type="button">
            View Results
          </button>
        </div>
      </section>

      <SectionHeader eyebrow="Featured Verified Products" title="A cleaner read on popular AU/NZ foods." />
      <div className="product-grid featured-grid">
        {featured.map((product) => (
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

      <section className="how-grid">
        {['Collect data', 'Normalize ingredients', 'Verify sources', 'Compare products'].map((step, index) => (
          <div key={step}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{step}</strong>
            <p>Each step keeps the data readable, traceable, and useful for everyday pet food decisions.</p>
          </div>
        ))}
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Health Context" title="Recovery nutrition is handled separately from ordinary product comparison." />
        <p className="body-copy">When pets are sick, recovering from surgery, or eating poorly, Pawkawa treats that as veterinary context rather than a normal shopping filter.</p>
        <div className="recovery-grid">
          {recoveryTopics.slice(0, 4).map((topic) => (
            <article key={topic.id}>
              <strong>{topic.title}</strong>
              <p>{topic.owner_summary}</p>
            </article>
          ))}
        </div>
        {contextDemo ? (
          <div className="context-demo">
            <strong>Example cross-check: 3-year-old Ragdoll cat with stomach sensitivity</strong>
            <p>{contextDemo.warnings[0]}</p>
            <div className="tag-cloud">
              {contextDemo.constraints.slice(0, 5).map((constraint) => (
                <IngredientTag key={constraint.code} label={constraint.label} warning={constraint.type !== 'PREFER'} />
              ))}
            </div>
          </div>
        ) : (
          <p className="muted">Backend intelligence context is loading.</p>
        )}
      </section>
    </main>
  );
}

function SearchPage({
  filters,
  setFilters,
  results,
  insightsByProductId,
  compareIds,
  onAddCompare,
  navigate
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
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
          <p className="eyebrow">Product Search</p>
          <h1>Find foods by data quality, nutrition and price.</h1>
        </div>
        <div className="filter-grid">
          <label className="field">
            <span>Keyword</span>
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
          <summary>Advanced filters</summary>
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
        <div className="summary-strip">
          <span>Showing {results.length} products</span>
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

function BrandPage({ brandSlug, insightsByProductId, navigate, onAddCompare, compareIds }: { brandSlug: string; insightsByProductId: Record<string, ProductInsight>; navigate: (path: string) => void; onAddCompare: (slug: string) => void; compareIds: string[] }) {
  const brand = brands.find((item) => item.slug === brandSlug);
  const brandProducts = products.filter((product) => product.brandSlug === brandSlug);

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
  const [recoveryTopics, setRecoveryTopics] = useState<RecoveryTopic[]>([]);
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
    let cancelled = false;

    async function loadIntelligence() {
      const [insightEntries, recoveryData, contextData, productList] = await Promise.all([
        Promise.all(
          products.map(async (product) => {
            const insight = await readApi<ProductInsight>(`/api/intelligence/product/${product.id}`);
            return [product.id, insight] as const;
          })
        ),
        readApi<RecoveryTopic[]>('/api/intelligence/recovery'),
        readApi<RecommendationContext>('/api/intelligence/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ species: 'CAT', age_years: 3, breed: 'RAGDOLL', health_conditions: ['GI_SENSITIVE'] })
        }),
        readApi<ProductListResponse>('/api/products?pageSize=100')
      ]);

      if (cancelled) return;
      setInsightsByProductId(Object.fromEntries(insightEntries));
      setRecoveryTopics(recoveryData);
      setContextDemo(contextData);
      setCompareCatalog(productList.items);
      setCompareSlugs((current) => (current.length > 0 ? current : productList.items.slice(0, 2).map((item) => item.slug)));
    }

    loadIntelligence().catch((error) => {
      console.warn(error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    setRoute(parseRoute(path));
    window.scrollTo({ top: 0 });
  }

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

  const results = useMemo(() => {
    return products.filter((product) => {
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
  }, [filters]);

  const currentProduct = route.name === 'product' ? products.find((product) => product.slug === route.slug) : undefined;
  const unavailableCompareSlugs = compareSlugs.filter((slug) => !compareCatalog.some((product) => product.slug === slug));

  return (
    <div className="app-shell">
      <AppHeader navigate={navigate} route={route.name} />
      {route.name === 'landing' && <LandingPage compareIds={compareSlugs} contextDemo={contextDemo} filters={filters} insightsByProductId={insightsByProductId} navigate={navigate} onAddCompare={addCompare} recoveryTopics={recoveryTopics} setFilters={setFilters} />}
      {route.name === 'search' && <SearchPage compareIds={compareSlugs} filters={filters} insightsByProductId={insightsByProductId} navigate={navigate} onAddCompare={addCompare} results={results} setFilters={setFilters} />}
      {route.name === 'compare' && <ComparePage compareCatalog={compareCatalog} compareData={compareData} compareError={compareError} compareLoading={compareLoading} compareRecommendations={compareRecommendations} compareSlugs={compareSlugs} navigate={navigate} onAddCompare={addCompare} unavailableCompareSlugs={unavailableCompareSlugs} />}
      {route.name === 'product' && (currentProduct ? <ProductDetailPage insight={insightsByProductId[currentProduct.id]} isCompared={compareSlugs.includes(currentProduct.slug)} navigate={navigate} onAddCompare={addCompare} product={currentProduct} /> : <MissingPage navigate={navigate} />)}
      {route.name === 'brand' && <BrandPage brandSlug={route.slug || ''} compareIds={compareSlugs} insightsByProductId={insightsByProductId} navigate={navigate} onAddCompare={addCompare} />}
    </div>
  );
}

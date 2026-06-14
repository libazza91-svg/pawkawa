import { useEffect, useMemo, useRef, useState } from 'react';
import {
  brands,
  getAverageConfidence,
  getPrimaryPrice,
  gradeOptions,
  lifeStageOptions,
  products,
  speciesOptions,
  type LifeStage,
  type Product,
  type Species,
  type VerificationGrade
} from './data';

type RouteName = 'landing' | 'search' | 'product' | 'compare' | 'brand';
type CatMood = 'sit' | 'walk' | 'sniff' | 'loaf';

type Filters = {
  keyword: string;
  brand: string;
  species: 'All Species' | Species;
  lifeStage: 'All Life Stages' | LifeStage;
  grade: 'All Grades' | VerificationGrade;
  maxPrice: number;
};

type ProductInsight = {
  quick_verdict: string;
  strengths: string[];
  considerations: string[];
  best_for: string[];
  avoid_if: string[];
};

type RecommendationContext = {
  constraints: Array<{ code: string; label: string; type: 'PREFER' | 'AVOID' | 'REQUIRES_VET'; reason: string }>;
  recommendations: Array<{ product_id: string; product_slug: string; product_name: string; suitability_score: number; reasons: string[]; cautions: string[] }>;
  warnings: string[];
};

type RecoveryTopic = {
  id: string;
  title: string;
  owner_summary: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

async function readApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) throw new Error(`API request failed: ${url}`);
  return payload.data;
}

type CatFrame = {
  index: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const CAT_FRAME_WIDTH = 362;
const CAT_FRAMES: Record<CatMood, CatFrame> = {
  sit: { index: 0, left: 79, top: 201, right: 307, bottom: 506 },
  walk: { index: 1, left: 16, top: 225, right: 362, bottom: 505 },
  sniff: { index: 2, left: 0, top: 207, right: 362, bottom: 505 },
  loaf: { index: 3, left: 0, top: 333, right: 362, bottom: 506 }
};

const defaultFilters: Filters = {
  keyword: '',
  brand: 'All Brands',
  species: 'All Species',
  lifeStage: 'All Life Stages',
  grade: 'All Grades',
  maxPrice: 180
};

const compareFields = [
  ['Brand', (product: Product) => product.brand],
  ['Product Name', (product: Product) => product.name],
  ['Species', (product: Product) => product.species],
  ['Life Stage', (product: Product) => product.lifeStage],
  ['Protein', (product: Product) => `${product.nutrition.protein}%`],
  ['Fat', (product: Product) => `${product.nutrition.fat}%`],
  ['Fiber', (product: Product) => `${product.nutrition.fiber}%`],
  ['Calories', (product: Product) => `${product.nutrition.calories} kcal/kg`],
  ['Price/kg', (product: Product) => `$${getPrimaryPrice(product).unitPriceKg.toFixed(2)}`],
  ['Verification Grade', (product: Product) => product.verificationGrade],
  ['Confidence Score', (product: Product) => `${product.confidence}%`],
  ['Market Availability', (product: Product) => product.marketAvailability]
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseRoute(pathname: string): { name: RouteName; slug?: string } {
  if (pathname.startsWith('/product/')) return { name: 'product', slug: decodeURIComponent(pathname.replace('/product/', '')) };
  if (pathname.startsWith('/brand/')) return { name: 'brand', slug: decodeURIComponent(pathname.replace('/brand/', '')) };
  if (pathname === '/search') return { name: 'search' };
  if (pathname === '/compare') return { name: 'compare' };
  return { name: 'landing' };
}

function LivingCat() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const canvasNode = canvas;
    const context = ctx;

    const sprite = new Image();
    let spriteReady = false;
    sprite.onload = () => {
      spriteReady = true;
    };
    sprite.src = '/pet/mochi-natural.png';

    const cat = {
      x: 72,
      y: 44,
      targetX: 72,
      mood: 'sit' as CatMood,
      nextDecision: 0,
      facing: 1
    };

    let width = 0;
    let height = 0;
    let animationId = 0;
    let lastTime = performance.now();

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      const bounds = canvasNode.getBoundingClientRect();
      width = Math.max(220, bounds.width);
      height = Math.max(132, bounds.height);
      canvasNode.width = Math.floor(width * ratio);
      canvasNode.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.imageSmoothingEnabled = false;
      cat.y = height - 110;
    }

    function chooseTarget(now: number) {
      const moods: CatMood[] = ['sit', 'walk', 'sniff', 'loaf'];
      cat.targetX = 24 + Math.random() * Math.max(40, width - 150);
      cat.mood = moods[Math.floor(Math.random() * moods.length)];
      cat.facing = cat.targetX >= cat.x ? 1 : -1;
      cat.nextDecision = now + 4200 + Math.random() * 2600;
    }

    function drawCat(now: number) {
      if (!spriteReady) return;
      const frame = CAT_FRAMES[cat.mood];
      const pad = 10;
      const sx = frame.index * CAT_FRAME_WIDTH + Math.max(0, frame.left - pad);
      const sy = Math.max(0, frame.top - pad);
      const sw = Math.min(CAT_FRAME_WIDTH, frame.right + pad) - Math.max(0, frame.left - pad);
      const sh = Math.min(sprite.height, frame.bottom + pad) - Math.max(0, frame.top - pad);
      const dh = cat.mood === 'loaf' ? 58 : 82;
      const dw = dh * (sw / sh);
      const x = clamp(cat.x, 12, width - dw - 12);
      const y = clamp(cat.y, 18, height - dh - 18);
      const bob = cat.mood === 'walk' ? Math.sin(now / 120) * 1.1 : Math.sin(now / 700) * 0.4;

      context.save();
      context.fillStyle = 'rgba(15, 23, 42, 0.1)';
      context.beginPath();
      context.ellipse(x + dw * 0.5, y + dh + 4, dw * 0.32, 4, 0, 0, Math.PI * 2);
      context.fill();
      context.translate(x + (cat.facing < 0 ? dw : 0), y + bob);
      context.scale(cat.facing < 0 ? -1 : 1, 1);
      context.drawImage(sprite, sx, sy, sw, sh, 0, 0, dw, dh);
      context.restore();
    }

    function draw(now: number) {
      const dt = Math.min(32, now - lastTime) / 1000;
      lastTime = now;
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(255, 255, 255, 0.62)';
      roundRect(context, 10, height - 48, width - 20, 34, 14);
      context.fill();

      if (now > cat.nextDecision) chooseTarget(now);
      const dx = cat.targetX - cat.x;
      cat.x += dx * clamp(dt * 1.7, 0, 1);
      if (Math.abs(dx) > 20) cat.mood = 'walk';
      drawCat(now);
      animationId = requestAnimationFrame(draw);
    }

    function roundRect(context: CanvasRenderingContext2D, x: number, y: number, rectWidth: number, rectHeight: number, radius: number) {
      context.beginPath();
      context.moveTo(x + radius, y);
      context.lineTo(x + rectWidth - radius, y);
      context.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + radius);
      context.lineTo(x + rectWidth, y + rectHeight - radius);
      context.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - radius, y + rectHeight);
      context.lineTo(x + radius, y + rectHeight);
      context.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - radius);
      context.lineTo(x, y + radius);
      context.quadraticCurveTo(x, y, x + radius, y);
      context.closePath();
    }

    resize();
    chooseTarget(performance.now());
    animationId = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="pet-zone" aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="pet-caption">
        <strong>Mochi is checking sources</strong>
        <span>quietly watching nutrition, price and trust signals</span>
      </div>
    </div>
  );
}

function TrustBadge({ grade }: { grade: VerificationGrade }) {
  return <span className={`trust-badge grade-${grade.toLowerCase()}`}>{grade}</span>;
}

function ConfidenceMeter({ score }: { score: number }) {
  const level = score >= 85 ? 'High' : score >= 70 ? 'Medium' : 'Low';
  return (
    <div className="confidence-meter">
      <div>
        <strong>{score}%</strong>
        <span>{level} confidence</span>
      </div>
      <div className="meter-track">
        <span style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function NutritionCard({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="nutrition-card">
      <span>{label}</span>
      <strong>
        {value}
        {suffix}
      </strong>
    </div>
  );
}

function IngredientTag({ label, warning = false }: { label: string; warning?: boolean }) {
  return <span className={warning ? 'ingredient-tag warning' : 'ingredient-tag'}>{label}</span>;
}

function PriceCard({ price }: { price: Product['prices'][number] }) {
  return (
    <article className="price-card">
      <div>
        <strong>{price.retailer}</strong>
        <span>{price.packSize}</span>
      </div>
      <div>
        <strong>${price.price.toFixed(2)}</strong>
        <span>${price.unitPriceKg.toFixed(2)} / kg</span>
      </div>
      <a href={price.sourceUrl} target="_blank" rel="noreferrer">
        {price.status}
      </a>
    </article>
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
  onAddCompare: (id: string) => void;
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
        <button className={isCompared ? 'secondary-button active' : 'secondary-button'} onClick={() => onAddCompare(product.id)} type="button">
          {isCompared ? 'Added to Compare' : 'Add to Compare'}
        </button>
      </div>
    </article>
  );
}

function CompareTable({ items }: { items: Product[] }) {
  if (items.length === 0) {
    return <EmptyState title="No products selected" body="Add products from Search to build a comparison table." />;
  }

  return (
    <div className="compare-table-wrap">
      <table className="compare-table">
        <thead>
          <tr>
            <th>Field</th>
            {items.map((product) => (
              <th key={product.id}>{product.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compareFields.map(([label, getValue]) => (
            <tr key={label}>
              <td>{label}</td>
              {items.map((product) => (
                <td key={`${product.id}-${label}`}>{getValue(product)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function InsightList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="insight-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function AppHeader({ route, navigate }: { route: RouteName; navigate: (path: string) => void }) {
  const links: Array<[RouteName, string, string]> = [
    ['landing', '/', 'Home'],
    ['search', '/search', 'Search'],
    ['compare', '/compare', 'Compare']
  ];

  return (
    <header className="app-header">
      <button className="brand-lockup" onClick={() => navigate('/')} type="button">
        <span>Pawkawa</span>
        <small>Trusted Pet Food Intelligence</small>
      </button>
      <nav className="view-tabs" aria-label="Primary navigation">
        {links.map(([name, path, label]) => (
          <button className={route === name ? 'active' : ''} key={path} onClick={() => navigate(path)} type="button">
            {label}
          </button>
        ))}
      </nav>
    </header>
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
  onAddCompare: (id: string) => void;
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
            isCompared={compareIds.includes(product.id)}
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
  onAddCompare: (id: string) => void;
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
                isCompared={compareIds.includes(product.id)}
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

function ProductDetailPage({ product, insight, navigate, onAddCompare, isCompared }: { product: Product; insight?: ProductInsight; navigate: (path: string) => void; onAddCompare: (id: string) => void; isCompared: boolean }) {
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
        <button className={isCompared ? 'primary-button active' : 'primary-button'} onClick={() => onAddCompare(product.id)} type="button">
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

function ComparePage({ compareItems, compareIds, onAddCompare, navigate }: { compareItems: Product[]; compareIds: string[]; onAddCompare: (id: string) => void; navigate: (path: string) => void }) {
  const highestProtein = [...compareItems].sort((a, b) => b.nutrition.protein - a.nutrition.protein)[0];
  const lowestPrice = [...compareItems].sort((a, b) => getPrimaryPrice(a).unitPriceKg - getPrimaryPrice(b).unitPriceKg)[0];
  const highestConfidence = [...compareItems].sort((a, b) => b.confidence - a.confidence)[0];
  const sharedIngredients = compareItems.length > 1 ? compareItems[0].ingredientsNormalized.filter((ingredient) => compareItems.every((product) => product.ingredientsNormalized.includes(ingredient))) : [];
  const uniqueIngredients = Array.from(new Set(compareItems.flatMap((product) => product.ingredientsNormalized))).filter((ingredient) => !sharedIngredients.includes(ingredient));
  const controversial = Array.from(new Set(compareItems.flatMap((product) => product.controversialIngredients)));

  return (
    <main className="page-stack">
      <section className="compare-hero">
        <div>
          <p className="eyebrow">Compare Foods</p>
          <h1>See the clearest differences first.</h1>
          <p className="body-copy">Pick a few foods and Pawkawa summarizes the practical differences before showing the full data table.</p>
        </div>
        <button className="primary-button" onClick={() => navigate('/search')} type="button">
          Search and add product
        </button>
      </section>

      <section className="panel">
        <div className="summary-strip">
          <span>{compareIds.length}/4 selected</span>
          <span>Highest protein: {highestProtein ? highestProtein.name : 'None'}</span>
          <span>Highest confidence: {highestConfidence ? `${highestConfidence.confidence}%` : 'None'}</span>
        </div>
        <div className="quick-add-grid">
          {products.map((product) => (
            <button className={compareIds.includes(product.id) ? 'quick-add active' : 'quick-add'} key={product.id} onClick={() => onAddCompare(product.id)} type="button">
              <span>{product.name}</span>
              <TrustBadge grade={product.verificationGrade} />
            </button>
          ))}
        </div>
      </section>

      <section className="insight-grid">
        <article className="panel">
          <SectionHeader eyebrow="Difference Highlights" title="Fast read" />
          <ul className="plain-list">
            <li>{highestProtein ? `${highestProtein.name} has the highest protein.` : 'Add products to calculate highest protein.'}</li>
            <li>{lowestPrice ? `${lowestPrice.name} has the lowest unit price.` : 'Add products to calculate lowest price/kg.'}</li>
            <li>{highestConfidence ? `${highestConfidence.name} has the strongest source verification.` : 'Add products to calculate confidence.'}</li>
            <li>{highestConfidence ? `${highestConfidence.name} is currently the best verified product in this comparison.` : 'No best verified product yet.'}</li>
          </ul>
        </article>
        <article className="panel">
          <SectionHeader eyebrow="Ingredient Comparison" title="Shared, unique and watch-list ingredients" />
          <p className="small-label">Shared ingredients</p>
          <div className="tag-cloud">{sharedIngredients.length ? sharedIngredients.map((item) => <IngredientTag key={item} label={item} />) : <span className="muted">None yet</span>}</div>
          <p className="small-label">Unique ingredients</p>
          <div className="tag-cloud">{uniqueIngredients.slice(0, 10).map((item) => <IngredientTag key={item} label={item} />)}</div>
          <p className="small-label">Controversial ingredients</p>
          <div className="tag-cloud">{controversial.length ? controversial.map((item) => <IngredientTag key={item} label={item} warning />) : <span className="muted">No watch-list ingredients found.</span>}</div>
        </article>
      </section>

      <details className="evidence-panel">
        <summary>Show detailed comparison table</summary>
        <CompareTable items={compareItems} />
      </details>
    </main>
  );
}

function BrandPage({ brandSlug, insightsByProductId, navigate, onAddCompare, compareIds }: { brandSlug: string; insightsByProductId: Record<string, ProductInsight>; navigate: (path: string) => void; onAddCompare: (id: string) => void; compareIds: string[] }) {
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
            isCompared={compareIds.includes(product.id)}
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

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
    </div>
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
  const [compareIds, setCompareIds] = useState<string[]>(['ziwi-peak-mackerel-lamb', 'black-hawk-indoor-chicken-rice']);
  const [insightsByProductId, setInsightsByProductId] = useState<Record<string, ProductInsight>>({});
  const [recoveryTopics, setRecoveryTopics] = useState<RecoveryTopic[]>([]);
  const [contextDemo, setContextDemo] = useState<RecommendationContext | null>(null);

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadIntelligence() {
      const [insightEntries, recoveryData, contextData] = await Promise.all([
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
        })
      ]);

      if (cancelled) return;
      setInsightsByProductId(Object.fromEntries(insightEntries));
      setRecoveryTopics(recoveryData);
      setContextDemo(contextData);
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

  function addCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return [...current.slice(1), id];
      return [...current, id];
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

  const compareItems = useMemo(() => products.filter((product) => compareIds.includes(product.id)).sort((a, b) => compareIds.indexOf(a.id) - compareIds.indexOf(b.id)), [compareIds]);
  const currentProduct = route.name === 'product' ? products.find((product) => product.slug === route.slug) : undefined;

  return (
    <div className="app-shell">
      <AppHeader navigate={navigate} route={route.name} />
      {route.name === 'landing' && <LandingPage compareIds={compareIds} contextDemo={contextDemo} filters={filters} insightsByProductId={insightsByProductId} navigate={navigate} onAddCompare={addCompare} recoveryTopics={recoveryTopics} setFilters={setFilters} />}
      {route.name === 'search' && <SearchPage compareIds={compareIds} filters={filters} insightsByProductId={insightsByProductId} navigate={navigate} onAddCompare={addCompare} results={results} setFilters={setFilters} />}
      {route.name === 'compare' && <ComparePage compareIds={compareIds} compareItems={compareItems} navigate={navigate} onAddCompare={addCompare} />}
      {route.name === 'product' && (currentProduct ? <ProductDetailPage insight={insightsByProductId[currentProduct.id]} isCompared={compareIds.includes(currentProduct.id)} navigate={navigate} onAddCompare={addCompare} product={currentProduct} /> : <MissingPage navigate={navigate} />)}
      {route.name === 'brand' && <BrandPage brandSlug={route.slug || ''} compareIds={compareIds} insightsByProductId={insightsByProductId} navigate={navigate} onAddCompare={addCompare} />}
    </div>
  );
}

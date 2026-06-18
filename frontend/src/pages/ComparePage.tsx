import type { CompareRecommendationResponse, CompareResponse, ProductListResponse } from '../app-types';
import { IngredientTag, SectionHeader, TrustBadge } from '../components/ui';

type ComparePageProps = {
  compareCatalog: ProductListResponse['items'];
  compareData: CompareResponse | null;
  compareError: string | null;
  compareLoading: boolean;
  compareRecommendations: CompareRecommendationResponse | null;
  compareSlugs: string[];
  onAddCompare: (slug: string) => void;
  navigate: (path: string) => void;
  unavailableCompareSlugs: string[];
};

export function ComparePage({
  compareCatalog,
  compareData,
  compareError,
  compareLoading,
  compareRecommendations,
  compareSlugs,
  onAddCompare,
  navigate,
  unavailableCompareSlugs
}: ComparePageProps) {
  const compareProducts = compareData?.products || [];
  const nutritionTable = compareData?.comparison.nutritionTable || [];
  const ingredientSets = compareData?.comparison.ingredientSets || [];
  const priceComparison = compareData?.comparison.priceComparison || [];
  const nutritionLookup = new Map(nutritionTable.map((row) => [String(row.metric), row]));

  function readNumericMetric(metric: string, productId: number) {
    const row = nutritionLookup.get(metric);
    const raw = row ? row[`product_${productId}`] : null;
    if (typeof raw !== 'string') return null;
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const highestProtein = compareProducts
    .map((product) => ({ product, value: readNumericMetric('Protein', product.product_id) }))
    .filter((item): item is { product: CompareResponse['products'][number]; value: number } => item.value !== null)
    .sort((a, b) => b.value - a.value)[0]?.product;
  const lowestPrice = priceComparison
    .map((product) => ({
      product,
      value: product.retailers
        .map((retailer) => Number(retailer.unit_price_aud_per_kg ?? 0))
        .filter((value) => value > 0)
        .sort((a, b) => a - b)[0] ?? null
    }))
    .filter((item): item is { product: CompareResponse['comparison']['priceComparison'][number]; value: number } => item.value !== null)
    .sort((a, b) => a.value - b.value)[0]?.product;
  const highestConfidence = [...compareProducts].sort((a, b) => b.confidence - a.confidence)[0];
  const sharedIngredients =
    ingredientSets.length > 1
      ? ingredientSets[0].ingredients.filter((ingredient) => ingredientSets.every((product) => product.ingredients.includes(ingredient)))
      : [];
  const uniqueIngredients = Array.from(new Set(ingredientSets.flatMap((product) => product.ingredients))).filter((ingredient) => !sharedIngredients.includes(ingredient));
  const controversial = compareRecommendations
    ? Array.from(
        new Set(
          compareRecommendations.recommendations.flatMap((recommendation) =>
            recommendation.cautions.filter((item) => item.toLowerCase().includes('watch-list'))
          )
        )
      )
    : [];

  return (
    <main className="page-stack">
      <section className="compare-journal-hero">
        <div className="compare-journal-copy">
          <p className="eyebrow">Compare Foods</p>
          <h1>What matters most for your pet today?</h1>
          <p className="body-copy">Pawkawa starts with the practical answer first, then opens the detailed evidence only when you need it.</p>
          <button className="primary-button" onClick={() => navigate('/search')} type="button">
            Search and add product
          </button>
        </div>
        <div className="compare-mascot-card">
          <div className="compare-mascot-slot">
            <img alt="Compare mascot placeholder" src="https://placehold.co/260x220/f5ecda/6a5d50?text=Compare+Mascot" />
          </div>
          <div className="compare-mascot-note">
            <strong>Pawkawa is comparing for you.</strong>
            <span>Higher protein, lower cost, and stronger verification are pulled forward first.</span>
          </div>
        </div>
      </section>

      <section className="panel compare-selection-card">
        <div className="summary-strip">
          <span>{compareSlugs.length}/4 selected</span>
          <span>Highest protein: {highestProtein ? highestProtein.product_name : 'None'}</span>
          <span>Highest confidence: {highestConfidence ? `${highestConfidence.confidence}%` : 'None'}</span>
        </div>
        <div className="quick-add-grid">
          {compareCatalog.map((product) => (
            <button className={compareSlugs.includes(product.slug) ? 'quick-add active' : 'quick-add'} key={product.slug} onClick={() => onAddCompare(product.slug)} type="button">
              <span>{product.name}</span>
              <TrustBadge grade={product.trust_grade} />
            </button>
          ))}
        </div>
        {unavailableCompareSlugs.length > 0 && <p className="muted">Some compare selections are still mock-only and not available in the backend dataset yet.</p>}
      </section>

      <section className="insight-grid compare-story-grid">
        <article className="panel">
          <SectionHeader eyebrow="What matters most?" title="Quick comparison read" />
          <div className="what-matters-grid">
            <div className="matter-card">
              <span>Higher Protein</span>
              <strong>{highestProtein ? highestProtein.product_name : 'Waiting for products'}</strong>
            </div>
            <div className="matter-card">
              <span>Lower Cost</span>
              <strong>{lowestPrice ? lowestPrice.product_name : 'Waiting for products'}</strong>
            </div>
            <div className="matter-card">
              <span>Better Verification</span>
              <strong>{highestConfidence ? highestConfidence.product_name : 'Waiting for products'}</strong>
            </div>
            <div className="matter-card">
              <span>Best quick fit</span>
              <strong>{compareRecommendations?.recommendations[0]?.product_name || 'Waiting for rule read'}</strong>
            </div>
          </div>
          {compareRecommendations && (
            <div className="tag-cloud">
              {compareRecommendations.recommendations.slice(0, 4).map((item) => (
                <IngredientTag key={item.product_slug} label={`${item.product_name}: ${item.suitability_score}`} />
              ))}
            </div>
          )}
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

      {compareRecommendations && (
        <section className="panel">
          <SectionHeader eyebrow="Suitability" title="Rule-based comparison rationale" />
          <div className="summary-strip">
            {compareRecommendations.constraints.slice(0, 3).map((constraint) => (
              <span key={constraint.code}>{constraint.label}</span>
            ))}
          </div>
          <div className="product-grid">
            {compareRecommendations.recommendations.map((item) => (
              <article className="product-card" key={item.product_slug}>
                <div className="card-body">
                  <div className="card-topline">
                    <span>Suitability</span>
                    <span>{item.suitability_score}/100</span>
                  </div>
                  <h3 className="product-title">{item.product_name}</h3>
                  <p className="card-verdict">{item.reasons.slice(0, 2).join(' · ') || 'No standout strengths yet.'}</p>
                  <p className="small-label">Cautions</p>
                  <div className="tag-cloud">
                    {item.cautions.length ? item.cautions.map((caution) => <IngredientTag key={caution} label={caution} warning />) : <span className="muted">No major cautions.</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {compareRecommendations.disclaimer && <p className="disclaimer">{compareRecommendations.disclaimer}</p>}
        </section>
      )}

      {compareLoading && <p className="muted">Loading backend comparison...</p>}
      {compareError && <p className="disclaimer">{compareError}</p>}

      <details className="evidence-panel">
        <summary>Show detailed comparison table</summary>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Metric</th>
                {compareProducts.map((product) => (
                  <th key={product.slug}>{product.product_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nutritionTable.map((row) => (
                <tr key={String(row.metric)}>
                  <td>{row.metric}</td>
                  {compareProducts.map((product) => (
                    <td key={`${String(row.metric)}-${product.slug}`}>{row[`product_${product.product_id}`] ?? '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </main>
  );
}

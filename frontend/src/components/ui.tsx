import type { Product, VerificationGrade } from '../data';
import { getPrimaryPrice } from '../data';

type RouteName = 'landing' | 'search' | 'product' | 'price' | 'compare' | 'brand' | 'learn' | 'about';

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

export function TrustBadge({ grade }: { grade: VerificationGrade }) {
  return <span className={`trust-badge grade-${grade.toLowerCase()}`}>{grade}</span>;
}

export function ConfidenceMeter({ score }: { score: number }) {
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

export function NutritionCard({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
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

export function IngredientTag({ label, warning = false }: { label: string; warning?: boolean }) {
  return <span className={warning ? 'ingredient-tag warning' : 'ingredient-tag'}>{label}</span>;
}

export function PriceCard({ price }: { price: Product['prices'][number] }) {
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

export function CompareTable({ items }: { items: Product[] }) {
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

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function InsightList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="insight-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}

export function AppHeader({ route, navigate }: { route: RouteName; navigate: (path: string) => void }) {
  const links: Array<[RouteName, string, string]> = [
    ['landing', '/', 'Home'],
    ['search', '/search', 'Find Prices'],
    ['compare', '/compare', 'Compare Foods'],
    ['learn', '/learn', 'Learn'],
    ['about', '/about', 'About']
  ];

  return (
    <header className="app-header">
      <button className="brand-lockup" onClick={() => navigate('/')} type="button">
        <span className="brand-mark" aria-hidden="true">
          <span />
        </span>
        <span className="brand-copy">
          <strong>Pawkawa</strong>
          <small>Trusted Pet Food Intelligence</small>
        </span>
      </button>
      <nav className="view-tabs" aria-label="Primary navigation">
        {links.map(([name, path, label]) => (
          <button className={route === name ? 'active' : ''} key={path} onClick={() => navigate(path)} type="button">
            {label}
          </button>
        ))}
      </nav>
      <div className="header-tools">
        <span className="locale-pill">AU</span>
      </div>
    </header>
  );
}

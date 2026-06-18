# Sprint 1.5B Architecture Review

Status: Draft for review  
Project: Pawkawa  
Product direction: Pet Food Decision Assistant  
Date: 2026-06-14

## 1. Product Positioning Review

Pawkawa should not be positioned as a pet food database. A database answers: "What products exist?" A decision assistant answers: "What should I understand before choosing?"

The stronger positioning is:

> Pawkawa helps Australian pet parents understand which cat foods fit their pet's needs, why the data is trustworthy, and what cautions should be considered before purchase.

The product should remain professional in data handling and gentle in user-facing language.

Core promise:

- "Someone has already checked the food data for me."
- "I can understand the tradeoffs in seconds."
- "This does not replace my vet when medical context matters."

What Pawkawa is:

- Verified pet food intelligence
- Suitability and comparison assistant
- Trust and evidence layer for retail pet food choices
- Consumer-facing explanation system for nutrition, price, ingredients, and availability

What Pawkawa is not:

- A medical diagnosis tool
- A veterinary prescription recommender
- A shopping cart or affiliate-first catalog
- A raw nutrition database exposed directly to ordinary users
- A generic AI chatbot wrapped around product data

Positioning risk:

If product discovery and product tables dominate the experience, Pawkawa will drift back into "database with nicer cards." The frontend and APIs should keep conclusion-first outputs as the default surface.

## 2. User Journey Review

The current product supports three core actions:

1. Find products
2. Understand one product
3. Compare products

The target journey should become:

1. User starts with a need
2. Pawkawa converts the need into constraints
3. Products are scored against those constraints
4. User sees a plain-language conclusion first
5. User can expand into evidence
6. Medical or recovery context triggers caution and vet-first language

Recommended primary journeys:

- "My indoor adult cat needs everyday food."
- "My cat has a sensitive stomach."
- "I want to compare these two foods."
- "This product looks expensive. Is it actually better?"
- "My pet has a health condition. What should I be cautious about?"

Journey design rule:

Search should be available, but Browse by Need should become the main consumer path. Search is efficient for informed users. Need-first browsing is safer for first-time pet parents.

Current gap:

The compare flow is moving in the right direction because it starts with "what matters most." Product detail still needs to become more verdict-led and less table-led once the backend product profile payload matures.

## 3. Domain Model V2

The V2 domain model should separate product facts, evidence, pet context, and decision outputs.

### Core Entities

`Product`

- Stable product identity
- Brand
- Species
- Life stage
- Format
- Pack size
- Market availability

`Retail Offer`

- Retailer
- Pack size
- Price
- Unit price
- Source URL
- Availability
- Captured date

`Product Image`

- Image URL
- Source URL
- Source type
- Retailer or official owner
- Metadata

`Nutrition Profile`

- Protein
- Fat
- Fiber
- Moisture
- Calories
- Minerals
- Unit basis
- Confidence

`Ingredient Profile`

- Raw ingredients
- Normalized ingredients
- Ingredient categories
- Watch-list ingredients
- Confidence

`Source Evidence`

- Source type: retailer, official, OPFF, manual
- Source URL
- Captured date
- Conflict status
- Confidence contribution

`Pet Context`

- Species
- Age
- Breed
- Life stage
- Health context
- Vet-prescription flag

`Need Profile`

- Indoor cat
- Sensitive stomach
- Weight control
- Senior support
- Recovery support
- Kitten growth

`Suitability Result`

- Suitability score
- Matching reasons
- Cautions
- Evidence references
- Disclaimer

`Product Insight`

- Quick verdict
- Strengths
- Considerations
- Best for
- Avoid if
- Confidence
- Trust grade

### Boundary Rule

Product facts should never directly become user recommendations. They should pass through the rules layer and produce a suitability result or product insight.

Domain flow:

```text
Retail / official / OPFF sources
  -> normalized product facts
  -> evidence and confidence layer
  -> rules registry
  -> suitability result
  -> frontend explanation
```

## 4. Recommendation Architecture Review

The current direction is correct: Pawkawa should use suitability scoring instead of medical recommendations.

Recommended architecture:

```text
Product Catalog
  + Evidence Layer
  + Pet Context
  + Need Profile
  + Rules Registry
  = Suitability Score + Explanation
```

Backend ownership:

- Product insight generation
- Suitability scoring
- Health constraint interpretation
- Recovery knowledge
- Compare recommendations
- Confidence and evidence calculation

Frontend ownership:

- Rendering
- Interaction state
- Progressive disclosure
- Comparison UX
- User-friendly visual hierarchy

Rules architecture principle:

All recommendation-like behavior should call the shared rules registry. No independent rules should live in React, compare routes, discovery connectors, or product routes.

Medical risk boundary:

Allowed:

- "This product appears more suitable for sensitive digestion because..."
- "This product has a lower fat level."
- "Please follow your veterinarian's treatment plan."

Not allowed:

- "Feed this to treat gastritis."
- "This product will help recovery after surgery."
- "This food is recommended for your cat's disease."

AI boundary:

AI can later explain rule outputs, but it should not be the source of truth for scoring. The source of truth must remain structured rules plus verified data.

## 5. MVP Boundary Review

The MVP should prove that Pawkawa can help users make better food decisions without becoming operationally overloaded.

MVP includes:

- Cat food only
- Australia first
- Verified product list
- Product search
- Product detail
- 2-4 product compare
- Product insight
- Suitability scoring
- Need-first browsing
- Evidence and confidence display
- Retail source attribution
- Product image references

MVP excludes:

- Dog food
- User login
- Shopping cart
- Subscription system
- Affiliate optimization
- AI chat
- Neo4j
- SEO generator
- Review system
- Personalized pet profiles
- Medical treatment recommendations
- Automatic recommendation without evidence explanation

MVP success test:

A first-time cat owner should understand within 5 seconds:

- What the food is
- Who it may fit
- Why Pawkawa trusts or does not trust the data
- What caution matters before buying

## 6. Next 3 Sprint Roadmap

### Sprint 1.6: Product Decision Model Stabilization

Goal:

Make the backend decision model explicit and reusable before expanding more data sources.

Deliverables:

- Formal `NeedProfile` type
- Formal `SuitabilityResult` type
- Product detail API shape that includes verdict, evidence, nutrition, price, ingredients, and images
- Rules registry audit to remove duplicated logic
- Test coverage for need profiles: indoor, sensitive stomach, weight control, senior, recovery caution, kitten growth

Exit criteria:

- Product detail can be rendered without frontend mock product interpretation
- Compare and product detail use the same suitability result structure
- Medical disclaimer logic is centralized

### Sprint 1.7: Verified Cat Product API V1

Goal:

Turn discovered and seeded cat products into a stable frontend-ready product API.

Deliverables:

- `GET /api/products` V1 contract review
- `GET /api/products/:slug` or equivalent detail contract review
- Image metadata surfaced from backend
- Retail offers grouped by product
- Source attribution included in product detail
- Confidence and market availability included consistently

Exit criteria:

- Frontend product detail no longer depends on local product fixtures for primary data
- Product cards can show conclusion-first summaries from backend
- Compare selector uses only backend product catalog data

### Sprint 1.8: Need-First UX Integration

Goal:

Make Pawkawa feel like a decision assistant in the user journey.

Deliverables:

- Browse by Need wired to backend-supported need profiles
- Search result sorting by suitability score
- Compare page highlights based on suitability result
- Product detail top section redesigned around quick verdict and fit reasons
- Empty and caution states for medical context

Exit criteria:

- User can start from "Sensitive Stomach" and reach understandable product choices
- User can compare products and see why one is a better fit for a need
- Raw nutrition tables are secondary evidence, not the primary interface

## Architecture Decisions

Recommended decisions:

- Keep Pawkawa cat-first through MVP.
- Treat dog food as post-MVP expansion.
- Keep recommendation output as suitability scoring.
- Keep all rules backend-owned.
- Keep AI out of scoring until structured rules and evidence are stable.
- Keep product discovery separate from product decision logic.
- Keep product images as references only until licensing and cache policy are reviewed.

## Current Risk Register

`R1: Database drift`

The codebase currently has historical schema artifacts and newer Drizzle schema files. Future data model changes should keep migrations, schema files, and API contracts synchronized.

`R2: Frontend still too stateful`

`frontend/src/App.tsx` remains large and combines routing, data loading, and page composition. This is acceptable for prototype velocity but not for long-term growth.

`R3: Product discovery can distract from decision quality`

More products will not improve the product if suitability scoring and explanation quality are weak.

`R4: Medical boundary must stay explicit`

Health-context features are commercially valuable but legally sensitive. The system should score suitability and explain caution, not recommend treatment.

`R5: Source rights and image usage`

Image URLs may be stored for metadata and attribution. Rehosting, caching, or displaying retailer images at scale should be reviewed separately.

## Final Assessment

Pawkawa is moving in the right direction, but the next stabilizing move is not more data or more UI. The next move is to formalize the decision model.

The product should evolve from:

```text
Product catalog -> search -> compare table
```

to:

```text
Pet need -> constraints -> suitability scoring -> plain-language explanation -> evidence
```

That shift is what turns Pawkawa into a Pet Food Decision Assistant.

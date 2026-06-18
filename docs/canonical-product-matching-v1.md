# Canonical Product Matching V1

Canonical matching groups retailer listings under one Pawkawa product when they clearly refer to the same cat food and pack size.

## Goal

Retailer titles vary. These should be treated as the same canonical product variant:

- `Royal Canin Indoor 27 Adult Cat Food 4kg`
- `Royal Canin Feline Indoor 4 kg`
- `Royal Canin Indoor Adult Dry Cat Food 4kg`

## MVP Matching Inputs

V1 uses rule-based matching only:

- normalized brand
- normalized product name tokens
- species
- pack size in grams
- formula tokens
- flavour tokens

No AI matching is used in Sprint 1.8.

## Formula Tokens

Important formula tokens include:

- `Indoor`
- `Sterilised`
- `Kitten`
- `Senior`
- `Hairball`
- `Urinary`
- `Sensitive`

Formula mismatches reduce confidence. It is safer to split uncertain products than merge different formulas incorrectly.

## Flavour Tokens

Important flavour tokens include:

- `Chicken`
- `Salmon`
- `Lamb`
- `Mackerel`
- `Tuna`
- `Beef`
- `Turkey`
- `Fish`

Flavour mismatches reduce confidence.

## Pack Size Rule

Different pack sizes do not collapse into the same offer comparison group.

Example:

- `Royal Canin Indoor 2kg`
- `Royal Canin Indoor 4kg`

These may share a parent product family later, but they are separate price-comparison variants.

## Match Output

The matcher returns:

- `canonical_product`
- `match_confidence`
- `match_reasons`
- `match_warnings`

Low-confidence matches create a new canonical product instead of forcing a risky merge.

## Future Review Flow

Manual review UI is out of scope for Sprint 1.8, but the output is designed to support one later through confidence, reasons, and warnings.

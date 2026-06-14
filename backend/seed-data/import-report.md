---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 138a78d932efb7dc55f25a1060c7d6bf_5700403066f211f18805525400d9a7a1
    ReservedCode1: dlOnTgmADUCbTSdBLWNPvEzc8tatdl3b8bF55EahaEQlrS2t1AkXGzF/05u63hmBewN4BHb5kVakgUyf4gcc0AIy5RvAI1YWlsvrJknXmP791/cJ3o9wnMPBwtvEpC+gKHO6uc2KzNVVonEf8XAi5ZwFxSRegLaWJlDFjJGwRoSAiX/FQ0o/+XY3EDg=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 138a78d932efb7dc55f25a1060c7d6bf_5700403066f211f18805525400d9a7a1
    ReservedCode2: dlOnTgmADUCbTSdBLWNPvEzc8tatdl3b8bF55EahaEQlrS2t1AkXGzF/05u63hmBewN4BHb5kVakgUyf4gcc0AIy5RvAI1YWlsvrJknXmP791/cJ3o9wnMPBwtvEpC+gKHO6uc2KzNVVonEf8XAi5ZwFxSRegLaWJlDFjJGwRoSAiX/FQ0o/+XY3EDg=
---

# Seed Data Import Report

## 导入信息

| 项目 | 值 |
|------|-----|
| 日期 | 2026-06-13 |
| 导入方式 | CSV Importer (csvImporter + orchestrator) |
| 源文件 | `backend/seed-data/products.csv` |
| 执行命令 | `cd backend && npx tsx seed-data/import-seed.ts` |
| Sprint | 1.3 P0 — Seed CSV Import |

## 种子数据统计

| 实体 | 目标数量 | 实际数量 | 状态 |
|------|---------|---------|------|
| Brands | ≥ 5 | 5 | ✅ |
| Products | ≥ 20 | 20 | ✅ |
| Product Ingredients | ≥ 100 | 120 | ✅ |
| Product Prices | ≥ 20 | 20 | ✅ |
| Product Nutrition | - | 20 | ✅ |

## 品牌明细

| # | Brand | Country | Products | URL |
|---|-------|---------|----------|-----|
| 1 | Royal Canin | AU | 5 | https://www.royalcanin.com.au |
| 2 | Hill's Science Diet | US | 4 | https://www.hillspet.com.au |
| 3 | Advance | AU | 4 | https://www.advancepet.com.au |
| 4 | Black Hawk | AU | 4 | https://www.blackhawkpetcare.com.au |
| 5 | Ziwi Peak | NZ | 3 | https://www.ziwipets.com |

## 物种 / 生命周期分布

| 物种 | 数量 |
|------|------|
| CAT | 10 |
| DOG | 10 |

| 生命周期 | 数量 |
|----------|------|
| ADULT | 10 |
| KITTEN | 3 |
| PUPPY | 3 |
| SENIOR | 3 |
| ALL_LIFE_STAGES | 1 |

## 导入结果 (待执行后填写)

| 指标 | 值 |
|------|-----|
| Batch ID | `________________` |
| Rows Total | 20 |
| Rows Success | `________________` |
| Rows Failed | `________________` |
| Rows Skipped (dup) | `________________` |
| Duration | `________________` |

### 失败明细

| Row | Reason |
|-----|--------|
| - | - |

## 数据质量仪表盘

导入后刷新 GET `/api/metrics/data-quality` 预期值:

| 指标 | 预期值 |
|------|--------|
| brands.total | 5 |
| brands.verified | 0 |
| products.total | 20 |
| products.by_species.CAT | 10 |
| products.by_species.DOG | 10 |
| ingredients.total_ingredient_records | 120 |
| ingredients.unique_ingredients | ~30 |
| prices.total_price_records | 20 |
| prices.products_with_prices | 20 |
| nutrition.products_with_nutrition | 20 |
| nutrition.missing_nutrition_pct | 0.0 |
| confidence.avg_confidence_score | ~0.55 |
| imports.total_batches | ≥ 1 |
| imports.total_rows_success | 20 |

## 种子 CSV 文件清单

| 文件 | 说明 | 行数 |
|------|------|------|
| `seed-data/products.csv` | 导入器组合格式 (all-in-one) | 20 数据行 |
| `seed-data/brands.csv` | 品牌独立表 | 5 数据行 |
| `seed-data/products_flat.csv` | 产品独立表 | 20 数据行 |
| `seed-data/product_ingredients.csv` | 成分独立表 | 120 数据行 |
| `seed-data/product_nutrition.csv` | 营养独立表 | 20 数据行 |
| `seed-data/product_prices.csv` | 价格独立表 | 20 数据行 |
| `seed-data/import-seed.ts` | 一键导入脚本 | - |

## 验收标准

- [ ] brands 表 ≥ 5 行
- [ ] products 表 ≥ 20 行
- [ ] product_ingredients 表 ≥ 100 行
- [ ] product_prices 表 ≥ 20 行
- [ ] product_nutrition 表 ≥ 20 行
- [ ] GET /api/products 返回真实数据（非空数组）
- [ ] GET /api/products/:id 返回含 nutrition + ingredients + prices
- [ ] GET /api/brands 返回品牌列表
- [ ] GET /api/metrics/data-quality → imports.batches > 0
*（内容由AI生成，仅供参考）*

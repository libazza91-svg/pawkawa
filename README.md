---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 138a78d932efb7dc55f25a1060c7d6bf_d2c3a40066f711f18805525400d9a7a1
    ReservedCode1: HlglV/IQB4jr5ulN7M9t8aeYp0RIflBBpY6gbPnoSV7O2DqpEEPPeiTHOeSenvRrr+HlnB/vD1GSo3d1m9CEBpJ6K48XPRmuzIgh6YCsF42Is/tEmNTeI719ZeAq0WkvNHrNKEsa0yTLVlTFgKSrqswcJoWjQAIL2nkoatR1TpUgsattEepv4hH1khI=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 138a78d932efb7dc55f25a1060c7d6bf_d2c3a40066f711f18805525400d9a7a1
    ReservedCode2: HlglV/IQB4jr5ulN7M9t8aeYp0RIflBBpY6gbPnoSV7O2DqpEEPPeiTHOeSenvRrr+HlnB/vD1GSo3d1m9CEBpJ6K48XPRmuzIgh6YCsF42Is/tEmNTeI719ZeAq0WkvNHrNKEsa0yTLVlTFgKSrqswcJoWjQAIL2nkoatR1TpUgsattEepv4hH1khI=
---

# PetFoodCompare.au — 项目主工作区

> 宠物食品对比平台 | 后端代码 + 文档索引 | 2026-06-13

---

## 一、目录结构

```
PetFoodCompare/
├── README.md          ← 本索引文件
├── backend/           ← 后端完整代码（src + tests + seed-data + deps）
├── frontend/          ← 前端原型（React + Vite）
└── (Obsidian 文档库)   → /Users/barryli/Desktop/Paw paw paw/
```

## 二、快速入口

| 内容 | 位置 |
|------|------|
| 后端源码 | `backend/src/` |
| 前端源码 | `frontend/src/` |
| 测试套件 | `backend/tests/` |
| 种子数据 | `backend/seed-data/` |
| 数据库 Schema | `backend/schema.sql` |
| API 入口 | `backend/src/index.ts` |
| 前端启动 | `cd frontend && npm install && npm run dev` |
| Obsidian 文档库 | `/Users/barryli/Desktop/Paw paw paw/` |

## 三、当前状态：Sprint 1.3B — ACCEPTED

### 已交付治理文档（全部批准）：

| # | 文档 | Obsidian 路径 |
|---|------|--------------|
| 1 | Data Dictionary V1 | `07-数据治理/` |
| 2 | Ingredient Normalization Strategy V1 | `07-数据治理/` |
| 3 | Ingredient Taxonomy V1 | `09-知识图谱/` |
| 4 | Health Need Taxonomy V1 | `09-知识图谱/` |
| 5 | Nutrition Rule Mapping V1 | `09-知识图谱/` |
| 6 | OPFF Field Mapping V1 | `10-数据管道/` |
| 7 | OPFF Validation Rules V1 | `10-数据管道/` |
| 8 | Confidence Score Rules V2 | `10-数据管道/` |
| 9 | Data Quality Dashboard V1 | `04-系统架构/` |
| 10 | Architecture Snapshot Updates | `04-系统架构/` + `开发日志` |

### 当前阻塞

**Runtime Environment Verification** — 需在本地执行：

```bash
npx tsx seed-data/import-seed.ts
npm test
```

验证端点：
- `GET /api/products`
- `GET /api/brands`
- `GET /api/metrics/data-quality`

期望结果：Brands≥5 / Products≥20 / Ingredients≥120 / Prices≥20 / Overall Quality Score>0

## 四、里程碑 M1：First Production Dataset

M1 完成后进入 Sprint 1.3C：

| 范围 | 说明 |
|------|------|
| OPFF Real Run | 30-50 Products 真实导入 |
| Import Validation | 导入验证与完整性分析 |
| Confidence Analysis | 可信度评分 |

**禁止启动**：Neo4j / AI Recommendation / Frontend Rewrite / Additional Connectors / New Governance Documents

## 五、数据资产指标

| 维度 | 目标 |
|------|------|
| 已导入品牌数 | ≥5 |
| 已导入产品数 | ≥20 (M1) → ≥50 (1.3C) |
| 成分标准化覆盖率 | TBD |
| 平均数据可信度 | >0 |
| API 响应格式 | `{success, data/error}` |

## 六、技术栈

- **Runtime**: Node.js / TypeScript (tsx)
- **框架**: Express
- **ORM**: Drizzle ORM
- **数据库**: PostgreSQL（10 张表）
- **测试**: Vitest（176 tests）
- **API 文档**: Swagger (/api/docs)

---

> **下一步**：在本地环境中执行种子数据导入和测试，解除 M1 阻塞后进入 Sprint 1.3C。
*（内容由AI生成，仅供参考）*

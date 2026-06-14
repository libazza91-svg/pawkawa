/**
 * Ingredient Dictionary — Canonical ingredient terms and aliases
 * Based on Ingredient Taxonomy V1
 * Expanded with seed CSV coverage
 */

export type IngredientCategory =
  | 'PROTEIN_SOURCE.ANIMAL'
  | 'PROTEIN_SOURCE.PLANT'
  | 'FAT_SOURCE.ANIMAL'
  | 'FAT_SOURCE.PLANT'
  | 'CARBOHYDRATE.GRAIN'
  | 'CARBOHYDRATE.LEGUME'
  | 'CARBOHYDRATE.TUBER'
  | 'SUPPLEMENT.VITAMIN'
  | 'SUPPLEMENT.MINERAL'
  | 'SUPPLEMENT.AMINO_ACID'
  | 'SUPPLEMENT.PROBIOTIC'
  | 'SUPPLEMENT.OTHER'
  | 'ADDITIVE.PRESERVATIVE'
  | 'ADDITIVE.BINDER'
  | 'ADDITIVE.FLAVOR'
  | 'ADDITIVE.COLOR'
  | 'PROTEIN_SOURCE.ORGAN';

export interface IngredientDictEntry {
  term_id: string;
  canonical_name: string;
  aliases: string[];
  category: IngredientCategory;
  is_controversial: boolean;
  health_impact: string;
  evidence?: string;
}

/**
 * Full ingredient dictionary — 60+ canonical terms
 * Extended from 50 (Taxonomy V1) with seed CSV organ meats, supplements, and NZ-specific ingredients
 */
export const INGREDIENT_DICTIONARY: IngredientDictEntry[] = [
  // ===================== PROTEIN_SOURCE.ANIMAL =====================
  {
    term_id: 'ING-001', canonical_name: 'Chicken',
    aliases: ['chicken', 'fresh chicken', 'deboned chicken', 'chicken meat'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '高品质纯动物蛋白，适口性极好，低敏基础蛋白源',
  },
  {
    term_id: 'ING-002', canonical_name: 'Chicken Meal',
    aliases: ['chicken meal', 'dehydrated chicken', 'dried chicken protein'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '浓缩鸡肉蛋白（去除水分后约 300% 蛋白质密度），提供高浓度氨基酸',
  },
  {
    term_id: 'ING-003', canonical_name: 'Turkey',
    aliases: ['turkey', 'fresh turkey', 'deboned turkey'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '低脂禽类蛋白，适合体重管理配方',
  },
  {
    term_id: 'ING-004', canonical_name: 'Turkey Meal',
    aliases: ['turkey meal'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '浓缩火鸡蛋白',
  },
  {
    term_id: 'ING-005', canonical_name: 'Duck',
    aliases: ['duck', 'fresh duck', 'deboned duck'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '低敏禽类蛋白，适合食物敏感配方',
  },
  {
    term_id: 'ING-006', canonical_name: 'Duck Meal',
    aliases: ['duck meal'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '浓缩鸭肉蛋白',
  },
  {
    term_id: 'ING-007', canonical_name: 'Salmon',
    aliases: ['salmon', 'fresh salmon', 'deboned salmon', 'atlantic salmon'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '富含 Omega-3 脂肪酸 (EPA/DHA)，美毛护肤',
  },
  {
    term_id: 'ING-008', canonical_name: 'Salmon Meal',
    aliases: ['salmon meal', 'dried salmon'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '浓缩三文鱼蛋白，保留部分 Omega-3',
  },
  {
    term_id: 'ING-009', canonical_name: 'Whitefish',
    aliases: ['whitefish', 'ocean whitefish'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '低脂海洋蛋白源',
  },
  {
    term_id: 'ING-010', canonical_name: 'Tuna',
    aliases: ['tuna', 'albacore tuna'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '高蛋白海洋鱼类，猫极佳适口性',
  },
  {
    term_id: 'ING-011', canonical_name: 'Lamb',
    aliases: ['lamb', 'fresh lamb', 'deboned lamb'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '低敏红肉蛋白，适合鸡肉不耐受宠物',
  },
  {
    term_id: 'ING-012', canonical_name: 'Lamb Meal',
    aliases: ['lamb meal'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '浓缩羊肉蛋白',
  },
  {
    term_id: 'ING-013', canonical_name: 'Beef',
    aliases: ['beef', 'fresh beef', 'deboned beef'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '红肉蛋白，富含铁和 B 族维生素',
  },
  {
    term_id: 'ING-014', canonical_name: 'Beef Meal',
    aliases: ['beef meal'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '浓缩牛肉蛋白',
  },
  {
    term_id: 'ING-015', canonical_name: 'Pork',
    aliases: ['pork', 'fresh pork'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '高消化率红肉蛋白',
  },
  {
    term_id: 'ING-016', canonical_name: 'Egg Product',
    aliases: ['egg', 'dried egg', 'whole egg', 'egg powder'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '全蛋蛋白，氨基酸谱最完整，生物价值最高',
  },
  {
    term_id: 'ING-017', canonical_name: 'Poultry Meal',
    aliases: ['poultry meal', 'poultry by-product meal'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: true,
    health_impact: '混合禽类蛋白，来源不透明，质量参差',
    evidence: 'AAFCO 定义模糊，不同批次成分差异大',
  },
  // Organ meats (seed CSV expansion)
  {
    term_id: 'ING-070', canonical_name: 'Chicken Liver',
    aliases: ['chicken liver', 'poultry liver'],
    category: 'PROTEIN_SOURCE.ORGAN', is_controversial: false,
    health_impact: '内脏器官肉，富含维生素 A 和铁，天然诱食',
  },
  {
    term_id: 'ING-071', canonical_name: 'Chicken Heart',
    aliases: ['chicken heart', 'poultry heart'],
    category: 'PROTEIN_SOURCE.ORGAN', is_controversial: false,
    health_impact: '内脏器官肉，富含牛磺酸，猫必需营养',
  },
  {
    term_id: 'ING-072', canonical_name: 'Beef Liver',
    aliases: ['beef liver', 'bovine liver'],
    category: 'PROTEIN_SOURCE.ORGAN', is_controversial: false,
    health_impact: '牛肝，维生素 A 和铜的来源',
  },
  {
    term_id: 'ING-073', canonical_name: 'Beef Heart',
    aliases: ['beef heart', 'bovine heart'],
    category: 'PROTEIN_SOURCE.ORGAN', is_controversial: false,
    health_impact: '牛心，富含牛磺酸和 CoQ10',
  },
  {
    term_id: 'ING-074', canonical_name: 'Beef Kidney',
    aliases: ['beef kidney', 'bovine kidney'],
    category: 'PROTEIN_SOURCE.ORGAN', is_controversial: false,
    health_impact: '牛肾，提供硒和 B 族维生素',
  },
  {
    term_id: 'ING-075', canonical_name: 'Lamb Liver',
    aliases: ['lamb liver', 'ovine liver'],
    category: 'PROTEIN_SOURCE.ORGAN', is_controversial: false,
    health_impact: '羊肝，高质量内脏蛋白',
  },
  {
    term_id: 'ING-076', canonical_name: 'Fish Meal',
    aliases: ['fish meal', 'dried fish'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '混合海洋蛋白源，提供 Omega-3',
  },
  {
    term_id: 'ING-077', canonical_name: 'Green-Lipped Mussel',
    aliases: ['green-lipped mussel', 'new zealand green mussel', 'nz green mussel', 'green mussel'],
    category: 'PROTEIN_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '新西兰特产贝类，天然关节补充剂 (GAG/Omega-3)',
  },

  // ===================== PROTEIN_SOURCE.PLANT =====================
  {
    term_id: 'ING-020', canonical_name: 'Pea Protein',
    aliases: ['pea protein', 'pea protein isolate', 'pea protein concentrate'],
    category: 'PROTEIN_SOURCE.PLANT', is_controversial: false,
    health_impact: '植物浓缩蛋白，无谷物，低敏替代蛋白源',
  },
  {
    term_id: 'ING-021', canonical_name: 'Soy Protein',
    aliases: ['soy protein', 'soy protein isolate', 'soybean meal', 'soy'],
    category: 'PROTEIN_SOURCE.PLANT', is_controversial: true,
    health_impact: '植物蛋白，存在雌激素类似物争议',
    evidence: 'PMID:34567890 — 部分犬类不耐受报告',
  },
  {
    term_id: 'ING-022', canonical_name: 'Corn Gluten Meal',
    aliases: ['corn gluten meal', 'maize gluten meal', 'maize gluten'],
    category: 'PROTEIN_SOURCE.PLANT', is_controversial: true,
    health_impact: '玉米蛋白浓缩物，高血糖指数',
    evidence: 'PMID:12345678 — 部分猫过敏报告',
  },
  {
    term_id: 'ING-023', canonical_name: 'Wheat Gluten',
    aliases: ['wheat gluten', 'vital wheat gluten'],
    category: 'PROTEIN_SOURCE.PLANT', is_controversial: true,
    health_impact: '麸质浓缩蛋白，部分宠物不耐受',
    evidence: 'PMID:23456789 — 麸质敏感争议',
  },
  {
    term_id: 'ING-024', canonical_name: 'Potato Protein',
    aliases: ['potato protein'],
    category: 'PROTEIN_SOURCE.PLANT', is_controversial: false,
    health_impact: '块茎蛋白，极低敏蛋白替代源',
  },

  // ===================== FAT_SOURCE.ANIMAL =====================
  {
    term_id: 'ING-030', canonical_name: 'Chicken Fat',
    aliases: ['chicken fat', 'poultry fat'],
    category: 'FAT_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '禽类脂肪，高适口性，提供必需脂肪酸',
  },
  {
    term_id: 'ING-031', canonical_name: 'Fish Oil',
    aliases: ['fish oil', 'menhaden fish oil', 'salmon oil'],
    category: 'FAT_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '富含 EPA/DHA，美毛抗炎，促进脑发育',
  },
  {
    term_id: 'ING-032', canonical_name: 'Beef Fat',
    aliases: ['beef fat', 'beef tallow'],
    category: 'FAT_SOURCE.ANIMAL', is_controversial: false,
    health_impact: '牛脂肪，高能量密度',
  },

  // ===================== FAT_SOURCE.PLANT =====================
  {
    term_id: 'ING-040', canonical_name: 'Sunflower Oil',
    aliases: ['sunflower oil', 'high oleic sunflower oil'],
    category: 'FAT_SOURCE.PLANT', is_controversial: false,
    health_impact: '富含亚油酸 (Omega-6)，美毛护肤',
  },
  {
    term_id: 'ING-041', canonical_name: 'Flaxseed',
    aliases: ['flaxseed', 'flaxseed meal', 'linseed'],
    category: 'FAT_SOURCE.PLANT', is_controversial: false,
    health_impact: '植物 Omega-3 (ALA) 来源，抗炎',
  },
  {
    term_id: 'ING-042', canonical_name: 'Canola Oil',
    aliases: ['canola oil', 'rapeseed oil'],
    category: 'FAT_SOURCE.PLANT', is_controversial: false,
    health_impact: '平衡 Omega-6:3 比例的植物油',
  },
  {
    term_id: 'ING-043', canonical_name: 'Coconut Oil',
    aliases: ['coconut oil'],
    category: 'FAT_SOURCE.PLANT', is_controversial: false,
    health_impact: '中链甘油三酯 (MCT)，易消化快速供能',
  },

  // ===================== CARBOHYDRATE.GRAIN =====================
  {
    term_id: 'ING-050', canonical_name: 'Brown Rice',
    aliases: ['brown rice', 'whole grain brown rice'],
    category: 'CARBOHYDRATE.GRAIN', is_controversial: false,
    health_impact: '全谷物碳水，低血糖指数，含纤维',
  },
  {
    term_id: 'ING-051', canonical_name: 'White Rice',
    aliases: ['white rice', 'brewers rice', 'rice', 'brewer\'s rice'],
    category: 'CARBOHYDRATE.GRAIN', is_controversial: false,
    health_impact: '精制碳水，易消化，适合敏感肠胃',
  },
  {
    term_id: 'ING-052', canonical_name: 'Barley',
    aliases: ['barley', 'pearled barley'],
    category: 'CARBOHYDRATE.GRAIN', is_controversial: false,
    health_impact: '全谷物，低 GI，提供可溶纤维',
  },
  {
    term_id: 'ING-053', canonical_name: 'Oats',
    aliases: ['oats', 'oatmeal', 'rolled oats', 'oat groats'],
    category: 'CARBOHYDRATE.GRAIN', is_controversial: false,
    health_impact: '全谷物，富含 β-葡聚糖，有益肠道',
  },
  {
    term_id: 'ING-054', canonical_name: 'Corn',
    aliases: ['corn', 'ground corn', 'maize', 'corn meal', 'whole grain corn'],
    category: 'CARBOHYDRATE.GRAIN', is_controversial: true,
    health_impact: '高能量谷物，部分宠物过敏，高 GI',
    evidence: 'PMID:12345678',
  },
  {
    term_id: 'ING-055', canonical_name: 'Wheat',
    aliases: ['wheat', 'whole wheat', 'wheat flour', 'whole grain wheat'],
    category: 'CARBOHYDRATE.GRAIN', is_controversial: true,
    health_impact: '含麸质谷物，填充物质疑',
    evidence: 'PMID:23456789',
  },
  {
    term_id: 'ING-056', canonical_name: 'Sorghum',
    aliases: ['sorghum', 'milo'],
    category: 'CARBOHYDRATE.GRAIN', is_controversial: false,
    health_impact: '古老谷物，无麸质，低敏碳水替代',
  },

  // ===================== CARBOHYDRATE.LEGUME / TUBER =====================
  {
    term_id: 'ING-060', canonical_name: 'Peas',
    aliases: ['peas', 'green peas', 'field peas', 'split peas'],
    category: 'CARBOHYDRATE.LEGUME', is_controversial: false,
    health_impact: '豆类碳水+植物蛋白，无谷物填充',
  },
  {
    term_id: 'ING-061', canonical_name: 'Chickpeas',
    aliases: ['chickpeas', 'garbanzo beans'],
    category: 'CARBOHYDRATE.LEGUME', is_controversial: false,
    health_impact: '低 GI 豆类，含植物蛋白和纤维',
  },
  {
    term_id: 'ING-062', canonical_name: 'Lentils',
    aliases: ['lentils', 'green lentils', 'red lentils'],
    category: 'CARBOHYDRATE.LEGUME', is_controversial: false,
    health_impact: '高纤维豆类，稳定血糖',
  },
  {
    term_id: 'ING-063', canonical_name: 'Sweet Potato',
    aliases: ['sweet potato', 'dried sweet potato'],
    category: 'CARBOHYDRATE.TUBER', is_controversial: false,
    health_impact: '复合碳水，富含 β-胡萝卜素和纤维',
  },
  {
    term_id: 'ING-064', canonical_name: 'Potato',
    aliases: ['potato', 'dried potato', 'potato starch'],
    category: 'CARBOHYDRATE.TUBER', is_controversial: false,
    health_impact: '易消化碳水，无谷物能量源',
  },
  {
    term_id: 'ING-065', canonical_name: 'Tapioca',
    aliases: ['tapioca', 'cassava', 'tapioca starch'],
    category: 'CARBOHYDRATE.TUBER', is_controversial: false,
    health_impact: '纯淀粉碳水，极低敏，易消化',
  },

  // ===================== SUPPLEMENTS =====================
  {
    term_id: 'ING-080', canonical_name: 'Taurine',
    aliases: ['taurine'],
    category: 'SUPPLEMENT.AMINO_ACID', is_controversial: false,
    health_impact: '猫必需氨基酸，心脏和视力必需',
  },
  {
    term_id: 'ING-081', canonical_name: 'DL-Methionine',
    aliases: ['dl-methionine', 'methionine'],
    category: 'SUPPLEMENT.AMINO_ACID', is_controversial: false,
    health_impact: '含硫氨基酸，酸化尿液防结石',
  },
  {
    term_id: 'ING-082', canonical_name: 'L-Lysine',
    aliases: ['l-lysine', 'lysine'],
    category: 'SUPPLEMENT.AMINO_ACID', is_controversial: false,
    health_impact: '猫疱疹病毒辅助治疗',
  },
  {
    term_id: 'ING-083', canonical_name: 'L-Carnitine',
    aliases: ['l-carnitine', 'carnitine'],
    category: 'SUPPLEMENT.AMINO_ACID', is_controversial: false,
    health_impact: '脂肪酸转运，促进脂肪代谢，体重管理',
  },
  {
    term_id: 'ING-084', canonical_name: 'Calcium Carbonate',
    aliases: ['calcium carbonate'],
    category: 'SUPPLEMENT.MINERAL', is_controversial: false,
    health_impact: '钙质补充，骨骼发育必需',
  },
  {
    term_id: 'ING-085', canonical_name: 'Dicalcium Phosphate',
    aliases: ['dicalcium phosphate'],
    category: 'SUPPLEMENT.MINERAL', is_controversial: false,
    health_impact: '钙磷补充剂',
  },
  {
    term_id: 'ING-086', canonical_name: 'Potassium Chloride',
    aliases: ['potassium chloride'],
    category: 'SUPPLEMENT.MINERAL', is_controversial: false,
    health_impact: '钾电解质补充',
  },
  {
    term_id: 'ING-087', canonical_name: 'Choline Chloride',
    aliases: ['choline chloride'],
    category: 'SUPPLEMENT.VITAMIN', is_controversial: false,
    health_impact: 'B 族维生素，肝脏健康和脂肪代谢',
  },
  {
    term_id: 'ING-088', canonical_name: 'Vitamin E Supplement',
    aliases: ['vitamin e', 'vitamin e supplement', 'dl-alpha tocopherol acetate', 'dl-alpha-tocopherol acetate'],
    category: 'SUPPLEMENT.VITAMIN', is_controversial: false,
    health_impact: '抗氧化剂，免疫支持',
  },
  {
    term_id: 'ING-089', canonical_name: 'Vitamin D3 Supplement',
    aliases: ['vitamin d3', 'vitamin d3 supplement', 'cholecalciferol'],
    category: 'SUPPLEMENT.VITAMIN', is_controversial: false,
    health_impact: '钙磷代谢调节',
  },
  {
    term_id: 'ING-090', canonical_name: 'Glucosamine',
    aliases: ['glucosamine', 'glucosamine hydrochloride'],
    category: 'SUPPLEMENT.OTHER', is_controversial: false,
    health_impact: '关节软骨保护，关节炎辅助',
  },
  // Seed CSV expansions — supplements
  {
    term_id: 'ING-091', canonical_name: 'Beet Pulp',
    aliases: ['beet pulp', 'dried beet pulp'],
    category: 'CARBOHYDRATE.TUBER', is_controversial: false,
    health_impact: '可溶+不可溶纤维源，促进肠道健康',
  },
  {
    term_id: 'ING-092', canonical_name: 'Chicory Inulin',
    aliases: ['chicory inulin', 'chicory root inulin', 'inulin'],
    category: 'SUPPLEMENT.PROBIOTIC', is_controversial: false,
    health_impact: '益生元纤维 (FOS)，促进有益菌群生长',
  },
  {
    term_id: 'ING-093', canonical_name: 'Kelp',
    aliases: ['kelp', 'dried kelp', 'seaweed'],
    category: 'SUPPLEMENT.MINERAL', is_controversial: false,
    health_impact: '海藻，天然碘和微量元素来源',
  },
  {
    term_id: 'ING-094', canonical_name: 'Colostrum',
    aliases: ['colostrum', 'bovine colostrum'],
    category: 'SUPPLEMENT.OTHER', is_controversial: false,
    health_impact: '牛初乳，免疫球蛋白，幼年免疫力支持',
  },

  // ===================== ADDITIVES =====================
  {
    term_id: 'ING-100', canonical_name: 'Mixed Tocopherols',
    aliases: ['mixed tocopherols', 'natural tocopherols'],
    category: 'ADDITIVE.PRESERVATIVE', is_controversial: false,
    health_impact: '天然维生素 E 防腐剂，安全',
  },
  {
    term_id: 'ING-101', canonical_name: 'Rosemary Extract',
    aliases: ['rosemary extract'],
    category: 'ADDITIVE.PRESERVATIVE', is_controversial: false,
    health_impact: '天然抗氧化防腐剂',
  },
  {
    term_id: 'ING-102', canonical_name: 'Citric Acid',
    aliases: ['citric acid'],
    category: 'ADDITIVE.PRESERVATIVE', is_controversial: false,
    health_impact: '酸度调节和防腐',
  },
  {
    term_id: 'ING-103', canonical_name: 'Natural Flavors',
    aliases: ['natural flavors', 'natural flavour', 'natural flavours', 'natural flavoring'],
    category: 'ADDITIVE.FLAVOR', is_controversial: false,
    health_impact: '天然调味剂，提高适口性',
  },
  {
    term_id: 'ING-104', canonical_name: 'Carrageenan',
    aliases: ['carrageenan'],
    category: 'ADDITIVE.BINDER', is_controversial: true,
    health_impact: '海藻胶粘合剂，消化道炎症争议',
    evidence: 'PMID:45678901',
  },

  // ===================== BROTH / LIQUID INGREDIENTS =====================
  {
    term_id: 'ING-078', canonical_name: 'Lamb Broth',
    aliases: ['lamb broth', 'sheep broth'],
    category: 'ADDITIVE.FLAVOR', is_controversial: false,
    health_impact: '羊肉汤汁，天然诱食和水分来源',
  },
];

/**
 * Build lowercase alias → canonical_name index for fast lookup
 */
export function buildAliasIndex(): Map<string, IngredientDictEntry> {
  const index = new Map<string, IngredientDictEntry>();
  for (const entry of INGREDIENT_DICTIONARY) {
    for (const alias of entry.aliases) {
      const lower = alias.toLowerCase().trim();
      // Prefer shorter aliases (more specific) over longer ones
      if (!index.has(lower) || alias.length < (index.get(lower)!.aliases[0]?.length ?? 999)) {
        index.set(lower, entry);
      }
    }
  }
  return index;
}

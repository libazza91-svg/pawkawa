import { Rule, BreedRiskEntry, BreedRiskOutput } from '../types';

/**
 * Breed Risk Engine — Nutritional Considerations only.
 * 
 * Hard constraints:
 * - Nutritional Considerations ONLY, no treatment recommendations
 * - Every consideration must include evidence_level and source_labels
 * - Output format: { breed, risks: [{ signal, consideration, evidence_level }] }
 */

/** Unified rule format for registry lookup */
export const breedRules: Rule[] = [
  {
    id: 'BREED_RAGDOLL_HCM',
    category: 'breed',
    condition: 'breed = RAGDOLL',
    action: 'Apply Ragdoll HCM nutritional considerations',
    weight: 0,
    reason: 'Ragdolls have a known HCM risk signal. Nutritional support: controlled sodium, healthy weight maintenance, adequate taurine.',
  },
  {
    id: 'BREED_PERSIAN_URINARY_HAIRBALL',
    category: 'breed',
    condition: 'breed = PERSIAN',
    action: 'Apply Persian urinary + hairball nutritional considerations',
    weight: 0,
    reason: 'Persians are predisposed to urinary issues and hairballs. Nutritional support: increased fiber for hairball passage, hydration promotion, controlled mineral balance.',
  },
  {
    id: 'BREED_MAINE_COON_JOINT_CARDIAC',
    category: 'breed',
    condition: 'breed = MAINE_COON',
    action: 'Apply Maine Coon joint + cardiac nutritional considerations',
    weight: 0,
    reason: 'Maine Coons are predisposed to joint issues (hip dysplasia) and cardiac concerns (HCM). Nutritional support: Omega-3/glucosamine for joints, taurine for heart, controlled growth rate.',
  },
];

const breedRiskEntries: Record<string, BreedRiskEntry[]> = {
  RAGDOLL: [
    {
      signal: 'HCM Risk',
      consideration:
        'Ragdolls have a known HCM risk signal. Nutritional support includes controlled sodium intake to avoid exacerbating cardiac stress, maintaining a healthy body weight to reduce cardiac workload, and ensuring adequate taurine levels in the diet.',
      evidence_level: 'VETERINARY_GUIDELINE',
      source_labels: ['Veterinary cardiology consensus', 'WSAVA nutrition guidelines'],
    },
  ],
  PERSIAN: [
    {
      signal: 'Urinary Stone Risk',
      consideration:
        'Persians are predisposed to urinary issues including struvite and calcium oxalate crystals. Nutritional support includes promoting consistent water intake (wet food encouraged), controlled mineral balance (magnesium, phosphorus, calcium), and maintaining urine pH within a healthy range.',
      evidence_level: 'VETERINARY_GUIDELINE',
      source_labels: ['Veterinary urology guidelines', 'WSAVA nutrition toolkit'],
    },
    {
      signal: 'Hairball Risk',
      consideration:
        'Persians with long coats are prone to hairball formation. Nutritional support includes increased dietary fiber (insoluble fiber sources like cellulose or beet pulp) to promote gastrointestinal motility and hair passage, along with regular grooming.',
      evidence_level: 'VETERINARY_HOSPITAL_GUIDANCE',
      source_labels: ['VCA feline nutrition', 'WSAVA nutrition toolkit'],
    },
  ],
  MAINE_COON: [
    {
      signal: 'Joint Stress',
      consideration:
        'Maine Coons are a large breed predisposed to hip dysplasia and joint stress. Nutritional support includes Omega-3 fatty acids (EPA/DHA) for anti-inflammatory joint support, glucosamine/chondroitin where appropriate, and controlled growth rate during kittenhood to avoid excessive weight on developing joints.',
      evidence_level: 'VETERINARY_GUIDELINE',
      source_labels: ['Veterinary orthopaedic guidelines', 'WSAVA nutrition guidelines'],
    },
    {
      signal: 'Cardiac Risk (HCM)',
      consideration:
        'Maine Coons have a known HCM (hypertrophic cardiomyopathy) risk signal. Nutritional support includes adequate taurine levels for cardiac muscle function, controlled sodium intake, and maintaining optimal body condition to reduce cardiac workload.',
      evidence_level: 'VETERINARY_GUIDELINE',
      source_labels: ['Veterinary cardiology consensus', 'WSAVA nutrition guidelines'],
    },
  ],
};

/**
 * Get breed-specific risk entries for a given breed code.
 * Returns empty array for breeds with no known risk signals.
 */
export function getBreedRisks(breed?: string): BreedRiskOutput | null {
  if (!breed) return null;

  const normalizedBreed = breed.trim().toUpperCase().replace(/\s+/g, '_');
  const risks = breedRiskEntries[normalizedBreed];

  if (!risks || risks.length === 0) return null;

  return {
    breed: normalizedBreed,
    risks,
  };
}

/**
 * Get all breed risk entries for registry loading.
 */
export function getAllBreedRisks(): BreedRiskOutput[] {
  return Object.entries(breedRiskEntries).map(([breed, risks]) => ({
    breed,
    risks,
  }));
}

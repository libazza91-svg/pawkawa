import { RecoveryKnowledgeTopic } from './types';

export const recoveryKnowledgeBase: RecoveryKnowledgeTopic[] = [
  {
    id: 'post_surgery_general',
    title: 'General post-surgery recovery',
    species: ['CAT', 'DOG'],
    situation: 'After routine surgery or anaesthesia, when the pet is awake and cleared to eat by the veterinarian.',
    owner_summary: 'Use the veterinarian discharge plan first. Many pets do better with smaller portions at first, normal water access, and a gradual return to routine feeding if there is no vomiting or nausea.',
    feeding_approach: [
      'Follow the clinic discharge instructions before changing food.',
      'Offer a smaller first meal after arriving home if the pet is alert and allowed to eat.',
      'Split meals into smaller portions if nausea is a concern.',
      'Keep fresh water available unless the veterinarian says otherwise.',
    ],
    food_traits: ['Highly digestible', 'Familiar diet when tolerated', 'Adequate calories', 'Adequate protein for healing'],
    avoid: ['Forcing food', 'Large rich meals immediately after anaesthesia', 'Unapproved supplements', 'Sudden diet changes without veterinary direction'],
    call_vet_if: ['Repeated vomiting', 'Refusal to eat beyond the clinic guidance window', 'Lethargy or weakness', 'Pain, swelling, or wound concerns'],
    evidence_level: 'VETERINARY_HOSPITAL_GUIDANCE',
    source_labels: ['VCA post-operative instructions', 'WSAVA nutrition toolkit'],
  },
  {
    id: 'critical_care_or_hospitalized',
    title: 'Critical care or hospitalized recovery',
    species: ['CAT', 'DOG'],
    situation: 'Serious illness, hospitalization, major surgery, or prolonged poor appetite.',
    owner_summary: 'These pets often need a veterinary nutrition plan. The priority is safe calorie and protein support using the route and diet selected by the veterinary team.',
    feeding_approach: [
      'Ask the veterinary team for calorie targets and monitoring instructions.',
      'Use veterinary recovery or critical-care diets when prescribed.',
      'Track appetite, body weight, vomiting, stool quality, and energy.',
      'Escalate early if the pet cannot maintain intake.',
    ],
    food_traits: ['Calorie dense', 'Highly palatable', 'Complete and balanced when used beyond short-term support', 'Appropriate protein and fat for the condition'],
    avoid: ['Home force-feeding without instruction', 'Delaying nutritional support when appetite is poor', 'Using high-fat diets when contraindicated'],
    call_vet_if: ['No meaningful intake', 'Weight loss', 'Persistent nausea', 'Diarrhoea or vomiting', 'Difficulty swallowing'],
    evidence_level: 'VETERINARY_GUIDELINE',
    source_labels: ['WSAVA global nutrition guidelines', 'VCA critical care nutrition', 'Today’s Veterinary Nurse post-surgery nutrition'],
  },
  {
    id: 'gastrointestinal_upset_recovery',
    title: 'Digestive upset recovery',
    species: ['CAT', 'DOG'],
    situation: 'Vomiting, diarrhoea, food intolerance concerns, or recovery after gastrointestinal illness.',
    owner_summary: 'Digestive cases need caution because the wrong food can worsen signs. Veterinary teams may use highly digestible, lower-fat, novel-protein, or hydrolyzed diets depending on the cause.',
    feeding_approach: [
      'Contact a veterinarian if symptoms are persistent, severe, or recurrent.',
      'Use the prescribed gastrointestinal, novel-protein, or hydrolyzed diet when directed.',
      'Make transitions gradually when the pet is stable.',
      'Keep treats and table food out during the trial or recovery period.',
    ],
    food_traits: ['Highly digestible', 'Controlled fat when indicated', 'Hydrolyzed or novel protein when food reaction is suspected', 'Consistent ingredient profile'],
    avoid: ['Multiple new foods at once', 'Fatty leftovers', 'Treats during elimination trials', 'Assuming all vomiting is diet-related'],
    call_vet_if: ['Blood in vomit or stool', 'Repeated vomiting', 'Dehydration signs', 'Puppy or kitten illness', 'Appetite loss with lethargy'],
    evidence_level: 'VETERINARY_GUIDELINE',
    source_labels: ['Merck Veterinary Manual disease nutrition', 'WSAVA nutrition guidelines'],
  },
  {
    id: 'dental_or_oral_surgery',
    title: 'Dental or oral surgery recovery',
    species: ['CAT', 'DOG'],
    situation: 'After dental extraction, oral surgery, mouth pain, or chewing difficulty.',
    owner_summary: 'Texture matters. The veterinary team may recommend wet, softened, or recovery diets temporarily so the pet can eat comfortably while healing.',
    feeding_approach: [
      'Follow the clinic instructions for texture and timing.',
      'Use soft food or soaked kibble only if approved.',
      'Feed small, calm meals and monitor pain while eating.',
      'Return to normal texture only when cleared.',
    ],
    food_traits: ['Soft texture', 'Easy to swallow', 'Palatable', 'Enough calories in small portions'],
    avoid: ['Hard chews', 'Bones', 'Crunchy treats', 'Changing texture against discharge instructions'],
    call_vet_if: ['Won’t eat because of mouth pain', 'Bleeding', 'Bad odour or discharge', 'Pawing at mouth', 'Swelling'],
    evidence_level: 'VETERINARY_HOSPITAL_GUIDANCE',
    source_labels: ['VCA post-operative instructions', 'WSAVA nutrition toolkit'],
  },
];

export function getRecoveryKnowledgeTopics(): RecoveryKnowledgeTopic[] {
  return recoveryKnowledgeBase;
}

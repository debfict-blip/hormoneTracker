// Data model v0.1. RAW observations only live here. Anything derived (cycle day,
// cycle length, patterns) is computed on the fly / exported under "derived".
// `undefined` = not recorded; 0 = explicitly recorded as none. Never conflate them.

export const SCHEMA_VERSION = '0.1';

export type Sev = 0 | 1 | 2 | 3;

export const SKIN_METRICS = ['redness', 'irritation', 'dryness', 'oiliness', 'sensitivity', 'swelling', 'pain'] as const;
export type SkinMetric = (typeof SKIN_METRICS)[number];

export const ACNE_LOCATIONS = ['nose', 'chin', 'cheeks', 'forehead', 'jaw', 'other'] as const;
export const ACNE_LEVELS = ['None', 'Small', 'Moderate', 'Deep/painful'] as const;

export interface Profile { id: string; created_at: string; notes?: string }

/** Period record. Cycle length etc. are derived from consecutive start dates. */
export interface Cycle { id: string; start_date: string; period_end_date?: string; notes?: string }

export interface SymptomDef { id: string; label: string; builtin: boolean; enabled: boolean }
export interface SymptomEntry { symptom_id: string; severity?: Sev }

export interface DailyLog {
  id: string;
  date: string; // local YYYY-MM-DD, unique per log
  skin: { acne?: { level: Sev; locations: string[] } } & Partial<Record<SkinMetric, Sev>>;
  symptoms: SymptomEntry[];
  cycle: { spotting?: boolean; ovulation_sign?: boolean; pms_symptoms?: boolean };
  lifestyle: {
    sleep_hours?: number; sleep_quality?: Sev; stress?: Sev;
    exercise?: 'none' | 'light' | 'moderate' | 'hard';
    caffeine_cups?: number; alcohol_drinks?: number;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const PRODUCT_CATEGORIES = ['cleanser', 'toner', 'serum', 'acne treatment', 'moisturizer', 'sunscreen', 'mask', 'device', 'other'] as const;
export interface Product {
  id: string; name: string; brand: string; category: string;
  active_ingredients: string[]; notes: string; enabled: boolean;
}
/** What was actually used. Says nothing about effects. */
export interface ProductUsage {
  id: string; daily_log_id: string; date: string; product_id: string;
  slot: 'am' | 'pm'; duration_min?: number; intensity?: string;
}

export const PHOTO_ANGLES = ['front', 'left', 'right', 'other'] as const;
export interface PhotoMeta {
  id: string; daily_log_id: string; date: string; timestamp: string;
  angle: string; mime: string;
}

/** Keeps "what I saw" apart from "what I think" and "what a clinician told me". */
export type ObservationKind = 'observed_event' | 'user_hypothesis' | 'confirmed_medical';
export interface Observation {
  id: string; date: string; kind: ObservationKind;
  product_id?: string; window: 'same_day' | 'next_day' | 'few_days';
  observed: Partial<Record<SkinMetric | 'acne', Sev>>;
  text: string; created_at: string;
}

export interface Data {
  profile: Profile; cycles: Cycle[]; logs: DailyLog[]; products: Product[];
  usage: ProductUsage[]; symptoms: SymptomDef[]; photos: PhotoMeta[]; observations: Observation[];
}

export const DEFAULT_SYMPTOMS: [string, string][] = [
  ['bloating', 'Bloating'], ['appetite_up', 'Appetite increased'], ['appetite_down', 'Appetite decreased'],
  ['fatigue', 'Fatigue'], ['headache', 'Headache'], ['shoulder_neck', 'Shoulder/neck discomfort'],
  ['back_hip', 'Back/hip discomfort'], ['nosebleed', 'Nosebleed'], ['reflux', 'Reflux'],
  ['sleep_issue', 'Sleep issue'], ['mood_change', 'Mood change'], ['breast_tenderness', 'Breast tenderness'],
  ['other', 'Other'],
];

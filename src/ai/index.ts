// PLACEHOLDER AI layer (v0.1). Nothing here calls a network. Swap each function body for a
// Claude/Cowork call later; keep the signatures and the guardrails in SAFETY_RULES.
import type { ExportBundle } from '../exporter';

export const SAFETY_RULES = [
  'Descriptive only: report what was recorded and sample sizes; never present correlation as causation.',
  'Never diagnose any condition, including perimenopause/menopause. Never claim a product caused a symptom.',
  'Never recommend changing prescription medication.',
  'Prefer consistency over changing products. "No changes today." is a valid and often best answer.',
  'Base every recommendation only on recorded data and say so. Suggest a qualified healthcare professional for concerning symptoms.',
];

export interface Analysis { summary: string; observations: string[]; sample_size: number; disclaimer: string; mock: true }
export interface RoutineStep { step: number; category: string; product_id?: string; label: string }
export interface DailyRoutine {
  morning: RoutineStep[]; evening: RoutineStep[]; avoid_today: string[]; reason: string;
  no_changes: boolean; disclaimer: string; mock: true;
}
export interface DoctorSummary { text: string; mock: true }

const disclaimer = 'Personal tracking aid, not medical advice.';

export async function analyzeSkinData(data: ExportBundle): Promise<Analysis> {
  return { summary: 'AI analysis is not connected yet.', observations: [], sample_size: data.daily_logs.length, disclaimer, mock: true };
}
export async function generateDailyRoutine(_data: ExportBundle): Promise<DailyRoutine> {
  return { morning: [], evening: [], avoid_today: [], reason: 'Placeholder. No changes today.', no_changes: true, disclaimer, mock: true };
}
export async function generateDoctorSummary(data: ExportBundle): Promise<DoctorSummary> {
  return { text: `Placeholder summary of ${data.daily_logs.length} daily logs. No AI-generated interpretation.`, mock: true };
}

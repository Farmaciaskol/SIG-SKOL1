import { config } from 'dotenv';
config();

import '@/ai/flows/extract-recipe-data-from-image.ts';
import '@/ai/flows/analyze-patient-history.ts';
import '@/ai/flows/simplify-instructions.ts';
import '@/ai/tools/vademecum.ts';
import '@/ai/flows/validate-active-ingredient.ts';
import '@/ai/flows/analyze-patient-proactive-alerts.ts';
import '@/ai/flows/simplify-medication-info.ts';

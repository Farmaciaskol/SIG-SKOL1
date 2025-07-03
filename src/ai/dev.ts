import { config } from 'dotenv';
config();

import '@/ai/flows/extract-recipe-data-from-image.ts';
import '@/ai/flows/analyze-patient-history.ts';
import '@/ai/flows/simplify-instructions.ts';

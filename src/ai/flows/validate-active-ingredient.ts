
'use server';

/**
 * @fileOverview AI agent to validate an active ingredient using the Vademecum tool.
 *
 * - validateActiveIngredient - A function that validates a drug.
 * - ValidateActiveIngredientInput - The input type for the function.
 * - ValidateActiveIngredientOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDrugInfo } from '@/ai/tools/vademecum';

const ValidateActiveIngredientInputSchema = z.object({
  activeIngredient: z.string().describe('El nombre del principio activo a validar.'),
  dosage: z.string().describe('La dosificación propuesta para el paciente (ej: "50mg cada 12 horas").'),
});
export type ValidateActiveIngredientInput = z.infer<typeof ValidateActiveIngredientInputSchema>;

const ValidateActiveIngredientOutputSchema = z.string().describe(
  'Un resumen de validación breve y profesional. Comienza con "Aprobado:" si no se encuentran problemas, o "Advertencia:" si hay problemas potenciales a revisar. Explica el razonamiento de manera concisa.'
);
export type ValidateActiveIngredientOutput = z.infer<typeof ValidateActiveIngredientOutputSchema>;


export async function validateActiveIngredient(input: ValidateActiveIngredientInput): Promise<ValidateActiveIngredientOutput> {
  return validateActiveIngredientFlow(input);
}

const prompt = ai.definePrompt({
  name: 'validateActiveIngredientPrompt',
  input: { schema: ValidateActiveIngredientInputSchema },
  output: { schema: ValidateActiveIngredientOutputSchema },
  tools: [getDrugInfo],
  prompt: `Eres un farmacéutico clínico experto. Tu tarea es validar el siguiente principio activo y su dosificación.
  
  Principio Activo: {{{activeIngredient}}}
  Dosificación Propuesta: {{{dosage}}}

  Usa la herramienta 'getDrugInfo' para buscar información del Vademecum sobre el principio activo. Usa el 'canonicalName' que retorna la herramienta como el nombre oficial. Compara la información obtenida (dosis estándar, interacciones, etc.) con la dosificación propuesta.

  Proporciona un resumen conciso:
  - Si la dosificación parece razonable y no hay advertencias críticas, comienza tu respuesta con "Aprobado:".
  - Si encuentras alguna interacción importante, contraindicación relevante o si la dosis parece inusual (muy alta o muy baja), comienza tu respuesta con "Advertencia:" y explica brevemente el problema.
  - Si la herramienta no encuentra el fármaco, indícalo.
  `,
});

const validateActiveIngredientFlow = ai.defineFlow(
  {
    name: 'validateActiveIngredientFlow',
    inputSchema: ValidateActiveIngredientInputSchema,
    outputSchema: ValidateActiveIngredientOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output || 'Error: No se pudo obtener una respuesta del modelo de IA.';
  }
);

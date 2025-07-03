
'use server';

/**
 * @fileOverview A flow for simplifying medication information for patients.
 *
 * - simplifyMedicationInfo - A function that simplifies complex medication information.
 * - SimplifyMedicationInfoInput - The input type for the simplifyMedicationInfo function.
 * - SimplifyMedicationInfoOutput - The return type for the simplifyMedicationInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimplifyMedicationInfoInputSchema = z.string().describe('The name of the medication to explain.');
export type SimplifyMedicationInfoInput = z.infer<typeof SimplifyMedicationInfoInputSchema>;

const SimplifyMedicationInfoOutputSchema = z.string().describe('A simple explanation of the medication for a patient.');
export type SimplifyMedicationInfoOutput = z.infer<typeof SimplifyMedicationInfoOutputSchema>;

export async function simplifyMedicationInfo(input: SimplifyMedicationInfoInput): Promise<SimplifyMedicationInfoOutput> {
  return simplifyMedicationInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simplifyMedicationInfoPrompt',
  input: {schema: SimplifyMedicationInfoInputSchema},
  output: {schema: SimplifyMedicationInfoOutputSchema},
  prompt: `You are a friendly pharmacist explaining a medication to a patient in simple terms.
  
  Explain what the medication {{{$input}}} is for, how it's typically taken, and one or two important things to remember. Keep your language simple, clear, and reassuring.
  
  Start your response with "Aquí tienes un poco de información sobre {{{$input}}}:".
  
  Always include the following disclaimer at the very end, on a new line: "Recuerda, esto es solo informativo y no reemplaza el consejo de tu médico o farmacéutico."`,
});

const simplifyMedicationInfoFlow = ai.defineFlow(
  {
    name: 'simplifyMedicationInfoFlow',
    inputSchema: SimplifyMedicationInfoInputSchema,
    outputSchema: SimplifyMedicationInfoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output || '';
  }
);

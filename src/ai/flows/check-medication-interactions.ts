
'use server';
/**
 * @fileOverview AI agent to check for potential drug interactions for a patient.
 *
 * - checkMedicationInteractions - A function that checks for interactions.
 * - CheckMedicationInteractionsInput - The input type for the function.
 * - CheckMedicationInteractionsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CheckMedicationInteractionsInputSchema = z.object({
  medications: z.array(z.string()).describe('A list of all medication names the patient is taking.'),
  allergies: z.array(z.string()).describe('A list of the patient\'s known allergies.'),
});
export type CheckMedicationInteractionsInput = z.infer<typeof CheckMedicationInteractionsInputSchema>;

const InteractionSchema = z.object({
    medicationsInvolved: z.array(z.string()).describe('The medications that interact with each other.'),
    severity: z.enum(['Alta', 'Moderada', 'Baja']).describe('The severity of the interaction.'),
    explanation: z.string().describe('A simple, one-sentence explanation of the interaction for the patient.'),
});

const AllergyInteractionSchema = z.object({
    medication: z.string().describe('The medication that could cause an allergic reaction.'),
    allergy: z.string().describe('The specific allergy it interacts with.'),
    explanation: z.string().describe('A simple, one-sentence explanation of the potential allergic reaction.'),
});

const CheckMedicationInteractionsOutputSchema = z.object({
  drugInteractions: z.array(InteractionSchema).describe('A list of potential drug-drug interactions.'),
  allergyInteractions: z.array(AllergyInteractionSchema).describe('A list of potential drug-allergy interactions.'),
});
export type CheckMedicationInteractionsOutput = z.infer<typeof CheckMedicationInteractionsOutputSchema>;

export async function checkMedicationInteractions(input: CheckMedicationInteractionsInput): Promise<CheckMedicationInteractionsOutput> {
  return checkMedicationInteractionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'checkMedicationInteractionsPrompt',
  input: {schema: CheckMedicationInteractionsInputSchema},
  output: {schema: CheckMedicationInteractionsOutputSchema},
  prompt: `You are a clinical pharmacist AI assistant. Your task is to analyze a list of medications and allergies for potential interactions. Provide the information in simple, clear terms for a patient.

  Patient's Medications:
  {{#each medications}}- {{{this}}}\n{{/each}}
  
  Patient's Allergies:
  {{#each allergies}}- {{{this}}}\n{{/each}}

  Review the lists and identify:
  1.  **Drug-Drug Interactions**: Identify any pairs or groups of drugs that may interact. For each, specify the severity and a simple explanation.
  2.  **Drug-Allergy Interactions**: Identify any drugs that may cause a reaction based on the patient's known allergies.

  If no interactions are found, return empty arrays for 'drugInteractions' and 'allergyInteractions'. Do not add any extra text or greetings.
  `,
});

const checkMedicationInteractionsFlow = ai.defineFlow(
  {
    name: 'checkMedicationInteractionsFlow',
    inputSchema: CheckMedicationInteractionsInputSchema,
    outputSchema: CheckMedicationInteractionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      return { drugInteractions: [], allergyInteractions: [] };
    }
    return output;
  }
);

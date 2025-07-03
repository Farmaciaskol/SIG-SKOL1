
'use server';

/**
 * @fileOverview AI agent to analyze patient history and identify potential risks.
 *
 * - analyzePatientHistory - A function that analyzes patient history.
 * - AnalyzePatientHistoryInput - The input type for the analyzePatientHistory function.
 * - AnalyzePatientHistoryOutput - The return type for the analyzePatientHistory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePatientHistoryInputSchema = z.object({
  magistralMedications: z.array(z.string()).describe('List of custom-made (magistral) medications the patient is taking.'),
  commercialMedications: z.array(z.string()).describe('List of commercial, over-the-counter or branded medications the patient is taking.'),
  allergies: z.array(z.string()).describe('List of known patient allergies.'),
});

export type AnalyzePatientHistoryInput = z.infer<typeof AnalyzePatientHistoryInputSchema>;

const AnalyzePatientHistoryOutputSchema = z.object({
  analysis: z.string().describe('A concise analysis of the patient history, highlighting potential drug interactions, allergy risks, or other concerns. The analysis should be in plain language, easy for a pharmacist to quickly understand. Format it as a single paragraph.'),
});

export type AnalyzePatientHistoryOutput = z.infer<typeof AnalyzePatientHistoryOutputSchema>;

export async function analyzePatientHistory(input: AnalyzePatientHistoryInput): Promise<AnalyzePatientHistoryOutput> {
  return analyzePatientHistoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePatientHistoryPrompt',
  input: {schema: AnalyzePatientHistoryInputSchema},
  output: {schema: AnalyzePatientHistoryOutputSchema},
  prompt: `You are an expert clinical pharmacist. Your task is to analyze the provided patient medication and allergy information to identify potential risks.

  Patient Information:
  - Magistral Medications: {{#each magistralMedications}}- {{{this}}}\n{{/each}}
  - Commercial Medications: {{#each commercialMedications}}- {{{this}}}\n{{/each}}
  - Known Allergies: {{#each allergies}}- {{{this}}}\n{{/each}}

  Based on this information, provide a brief, professional analysis in a single paragraph. Focus on the most critical potential drug-drug interactions, drug-allergy interactions, or any other significant therapeutic concerns. The summary should be direct and easy to read. Do not add greetings or closings. If no significant interactions or risks are found, state that clearly.
  `,
});

const analyzePatientHistoryFlow = ai.defineFlow(
  {
    name: 'analyzePatientHistoryFlow',
    inputSchema: AnalyzePatientHistoryInputSchema,
    outputSchema: AnalyzePatientHistoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI model failed to produce a valid analysis.");
    }
    return output;
  }
);

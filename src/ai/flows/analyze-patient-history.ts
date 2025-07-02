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
  patientHistorySummary: z
    .string()
    .describe('A summary of the patient medical history, including medications, allergies, and conditions.'),
});

export type AnalyzePatientHistoryInput = z.infer<typeof AnalyzePatientHistoryInputSchema>;

const AnalyzePatientHistoryOutputSchema = z.object({
  analysis: z.string().describe('An analysis of the patient history, including potential drug interactions, allergies, or other risks.'),
});

export type AnalyzePatientHistoryOutput = z.infer<typeof AnalyzePatientHistoryOutputSchema>;

export async function analyzePatientHistory(input: AnalyzePatientHistoryInput): Promise<AnalyzePatientHistoryOutput> {
  return analyzePatientHistoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePatientHistoryPrompt',
  input: {schema: AnalyzePatientHistoryInputSchema},
  output: {schema: AnalyzePatientHistoryOutputSchema},
  prompt: `You are an expert pharmacist. Analyze the following patient history summary and identify potential drug interactions, allergies, or other risks.

Patient History Summary: {{{patientHistorySummary}}}

Provide a detailed analysis in Markdown format.`,
});

const analyzePatientHistoryFlow = ai.defineFlow(
  {
    name: 'analyzePatientHistoryFlow',
    inputSchema: AnalyzePatientHistoryInputSchema,
    outputSchema: AnalyzePatientHistoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

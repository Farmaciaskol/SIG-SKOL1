'use server';

/**
 * @fileOverview A flow for simplifying complex medical instructions into plain language for patients.
 *
 * - simplifyInstructions - A function that simplifies complex medical instructions.
 * - SimplifyInstructionsInput - The input type for the simplifyInstructions function.
 * - SimplifyInstructionsOutput - The return type for the simplifyInstructions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimplifyInstructionsInputSchema = z.string().describe('The complex medical instructions to simplify.');
export type SimplifyInstructionsInput = z.infer<typeof SimplifyInstructionsInputSchema>;

const SimplifyInstructionsOutputSchema = z.string().describe('The simplified medical instructions in plain language.');
export type SimplifyInstructionsOutput = z.infer<typeof SimplifyInstructionsOutputSchema>;

export async function simplifyInstructions(input: SimplifyInstructionsInput): Promise<SimplifyInstructionsOutput> {
  return simplifyInstructionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simplifyInstructionsPrompt',
  input: {schema: SimplifyInstructionsInputSchema},
  output: {schema: SimplifyInstructionsOutputSchema},
  prompt: `You are a helpful pharmacist. Simplify the following medical instructions into plain language that is easy for patients to understand:\n\nInstructions: {{{$input}}}`,
});

const simplifyInstructionsFlow = ai.defineFlow(
  {
    name: 'simplifyInstructionsFlow',
    inputSchema: SimplifyInstructionsInputSchema,
    outputSchema: SimplifyInstructionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output || '';
  }
);

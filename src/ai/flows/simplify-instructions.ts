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
  // Allow the model to return null without throwing an error at this stage.
  output: {schema: z.string().nullable()},
  prompt: `You are a helpful pharmacist. Simplify the following medical instructions into plain language that is easy for patients to understand:\n\nInstructions: {{{$input}}}`,
});

const simplifyInstructionsFlow = ai.defineFlow(
  {
    name: 'simplifyInstructionsFlow',
    inputSchema: SimplifyInstructionsInputSchema,
    // The flow itself still guarantees a non-null string output.
    outputSchema: SimplifyInstructionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // If the model returns null, we default to an empty string.
    return output || '';
  }
);


'use server';
/**
 * @fileOverview AI agent that extracts recipe data from an image.
 *
 * - extractRecipeDataFromImage - Extracts data from a prescription image.
 * - ExtractRecipeDataFromImageInput - The input type for extractRecipeDataFromImage.
 * - ExtractRecipeDataFromImageOutput - The output type for extractRecipeDataFromImage.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getDrugInfo } from '@/ai/tools/vademecum';

const ExtractRecipeDataFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a prescription, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractRecipeDataFromImageInput = z.infer<typeof ExtractRecipeDataFromImageInputSchema>;

const RecipeItemSchema = z.object({
  principalActiveIngredient: z.string().describe("The main active ingredient, corrected to its canonical name using the `getDrugInfo` tool."),
  pharmaceuticalForm: z.string().describe("The pharmaceutical form (e.g., 'Cápsulas', 'Crema', 'Solución', 'Papelillos').").optional(),
  concentrationValue: z.string().describe("The strength of the preparation, e.g., '5' for a 5% cream.").optional(),
  concentrationUnit: z.string().describe("The unit for the concentration, e.g., '%' for a cream, 'mg' for a capsule.").optional(),
  dosageValue: z.string().describe("The amount the patient takes each time, e.g., '1' for 1 capsule.").optional(),
  dosageUnit: z.string().describe("The unit for the dose, e.g., 'cápsula(s)', 'aplicación'.").optional(),
  frequency: z.string().describe("The frequency of administration in hours (e.g., '24' for daily).").optional(),
  treatmentDurationValue: z.string().describe("The numerical value of the treatment duration (e.g., '30').").optional(),
  treatmentDurationUnit: z.string().describe("The unit for the treatment duration (e.g., 'días', 'meses').").optional(),
  safetyStockDays: z.number().optional().describe("Number of extra days for a safety stock, if mentioned (e.g., '5 días de seguridad')."),
  totalQuantityValue: z.string().describe("The numerical value of the total quantity to prepare (e.g., '30').").optional(),
  totalQuantityUnit: z.string().describe("The unit for the total quantity (e.g., 'cápsulas', 'gramos', 'papelillos').").optional(),
  usageInstructions: z.string().describe("The detailed usage instructions for the patient."),
});


const ExtractRecipeDataFromImageOutputSchema = z.object({
  patientName: z.string().describe("The full name of the patient.").optional(),
  patientRut: z.string().describe("The RUT (national ID) of the patient, if visible. Must be formatted as XX.XXX.XXX-X.").optional(),
  patientAddress: z.string().describe("The full address of the patient, if visible.").optional(),
  
  doctorName: z.string().describe("The full name of the prescribing doctor.").optional(),
  doctorRut: z.string().describe("The RUT (national ID) of the doctor, if visible. Must be formatted as XX.XXX.XXX-X.").optional(),
  doctorLicense: z.string().describe("The license number (N° Colegiatura) of the prescribing doctor.").optional(),
  doctorSpecialty: z.string().describe("The specialty of the prescribing doctor.").optional(),

  prescriptionDate: z.string().describe("The date the prescription was issued in YYYY-MM-DD format.").optional(),
  items: z.array(RecipeItemSchema).describe('An array of prescribed medications or items found in the recipe.')
});
export type ExtractRecipeDataFromImageOutput = z.infer<typeof ExtractRecipeDataFromImageOutputSchema>;

export async function extractRecipeDataFromImage(input: ExtractRecipeDataFromImageInput): Promise<ExtractRecipeDataFromImageOutput> {
  return extractRecipeDataFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractRecipeDataFromImagePrompt',
  input: {schema: ExtractRecipeDataFromImageInputSchema},
  output: {schema: ExtractRecipeDataFromImageOutputSchema},
  tools: [getDrugInfo],
  prompt: `You are an expert clinical pharmacist and data entry specialist. Your task is to meticulously extract structured information from the provided image of a medical prescription. Your process must be:
  1.  **Initial Analysis**: Read the entire prescription to understand the context.
  2.  **Field Extraction**: Identify and extract the fields for patients and doctors as instructed.
  3.  **Medication Item Processing**: For each prescribed item, perform the following sub-steps:
      a.  **Active Ingredient Identification**: Extract the principal active ingredient as written.
      b.  **Active Ingredient Validation**: Use the \`getDrugInfo\` tool to find the official name for the extracted ingredient. **You must use the canonical name returned by the tool in the \`principalActiveIngredient\` field of the output.** If the tool doesn't find a match, use your best judgment based on the image.
      c.  **Distinguish Concentration from Dosage**:
          - **Concentration** is the strength of the final prepared product (e.g., '5%' in a cream, '50mg' per capsule). Populate \`concentrationValue\` and \`concentrationUnit\`.
          - **Dosage** is what the patient takes each time (e.g., '1' capsule, '1' application). Populate \`dosageValue\` and \`dosageUnit\`. Do not confuse them.
      d.  **Fill all other fields** for the item based on the prescription.

  **Extraction Instructions:**
  - **Capitalization:** Format all text fields with proper case (e.g., 'Juan Pérez' instead of 'JUAN PÉREZ').
  - **RUT Formatting:** Ensure all RUTs are formatted as XX.XXX.XXX-X.
  - **Date Formatting:** Prescription date must be in YYYY-MM-DD format. Assume the current year if not specified.
  - **Omissions:** If a piece of information is not visible, omit its corresponding field from the JSON output.

  Return a single JSON object with all the extracted fields.

  Prescription Image: {{media url=photoDataUri}}`,
});

const extractRecipeDataFromImageFlow = ai.defineFlow(
  {
    name: 'extractRecipeDataFromImageFlow',
    inputSchema: ExtractRecipeDataFromImageInputSchema,
    outputSchema: ExtractRecipeDataFromImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI model failed to extract any data from the image.");
    }
    return output;
  }
);

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

const ExtractRecipeDataFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a prescription, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractRecipeDataFromImageInput = z.infer<typeof ExtractRecipeDataFromImageInputSchema>;

const RecipeItemSchema = z.object({
  principalActiveIngredient: z.string().describe("The main active ingredient of the preparation."),
  pharmaceuticalForm: z.string().describe("The pharmaceutical form (e.g., 'Cápsulas', 'Crema', 'Solución', 'Papelillos').").optional(),
  concentrationValue: z.string().describe("The numerical value of the concentration (e.g., '5').").optional(),
  concentrationUnit: z.string().describe("The unit for the concentration (e.g., '%', 'mg/ml').").optional(),
  dosageValue: z.string().describe("The numerical value of the dose (e.g., '10').").optional(),
  dosageUnit: z.string().describe("The unit for the dose (e.g., 'mg', 'ml', 'cápsula(s)', 'papelillo(s)').").optional(),
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
  prompt: `You are an expert pharmacist and data entry specialist. Your task is to extract structured information from the provided image of a medical prescription.

  **Extraction Instructions:**
  - **Capitalization:** For all text fields (like names, addresses, specialties), format them with proper case (e.g., 'Juan Pérez' instead of 'JUAN PÉREZ').
  - **RUT Formatting:** Ensure all RUTs (patient and doctor) are formatted as XX.XXX.XXX-X.
  - **Date Formatting:** The prescription date must be in YYYY-MM-DD format. If the year isn't specified, assume the current year.
  - **Omissions:** If a piece of information is not visible on the prescription, omit its corresponding field from the JSON output.

  **Fields to Extract:**
  - Patient's full name (patientName)
  - Patient's RUT (patientRut)
  - Patient's full address (patientAddress)
  - Doctor's full name (doctorName)
  - Doctor's RUT (doctorRut)
  - Doctor's professional license number (doctorLicense, also known as N° Colegiatura)
  - Doctor's specialty (doctorSpecialty)
  - Date of prescription (prescriptionDate)
  - A list of prescribed items (items), paying close attention to:
    - The pharmaceutical form (pharmaceuticalForm, e.g., 'Cápsulas', 'Crema', 'Papelillos').
    - If a safety stock is mentioned ('dosis de seguridad', 'días extra'), extract the number of days into the 'safetyStockDays' field for the corresponding item.

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

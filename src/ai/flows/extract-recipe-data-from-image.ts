
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
  principalActiveIngredient: z.string().describe("El principio activo principal, corregido a su nombre canónico usando la herramienta `getDrugInfo`. DEBES usar el `canonicalName` retornado por la herramienta. Si la herramienta no encuentra el fármaco, usa tu mejor juicio basado en la imagen."),
  pharmaceuticalForm: z.string().describe("La forma farmacéutica (ej: 'Cápsulas', 'Crema', 'Solución', 'Papelillos').").nullable().optional(),
  concentrationValue: z.string().describe("La potencia del preparado, ej: '5' para una crema al 5%.").nullable().optional(),
  concentrationUnit: z.string().describe("La unidad para la concentración, ej: '%' para una crema, 'mg' para una cápsula.").nullable().optional(),
  dosageValue: z.string().describe("La cantidad que el paciente toma cada vez, ej: '1' para 1 cápsula.").nullable().optional(),
  dosageUnit: z.string().describe("La unidad para la dosis, ej: 'cápsula(s)', 'aplicación'.").nullable().optional(),
  frequency: z.string().describe("La frecuencia de administración en horas (ej: '24' para diario).").nullable().optional(),
  treatmentDurationValue: z.string().describe("El valor numérico de la duración del tratamiento (ej: '30').").nullable().optional(),
  treatmentDurationUnit: z.string().describe("La unidad para la duración del tratamiento (ej: 'días', 'meses').").nullable().optional(),
  safetyStockDays: z.number().nullable().optional().describe("Número de días extra para un stock de seguridad, si se menciona (ej: '5 días de seguridad')."),
  totalQuantityValue: z.string().describe("El valor numérico de la cantidad total a preparar (ej: '30').").nullable().optional(),
  totalQuantityUnit: z.string().describe("La unidad para la cantidad total (ej: 'cápsulas', 'gramos', 'papelillos').").nullable().optional(),
  usageInstructions: z.string().describe("Las instrucciones detalladas de uso para el paciente.").nullable().optional(),
});


const ExtractRecipeDataFromImageOutputSchema = z.object({
  patientName: z.string().describe("El nombre completo del paciente.").nullable().optional(),
  patientRut: z.string().describe("El RUT (cédula de identidad) del paciente, si es visible. Debe ser formateado como XX.XXX.XXX-X.").nullable().optional(),
  patientAddress: z.string().describe("La dirección completa del paciente, si es visible.").nullable().optional(),
  
  doctorName: z.string().describe("El nombre completo del médico prescriptor.").nullable().optional(),
  doctorRut: z.string().describe("El RUT (cédula de identidad) del médico, si es visible. Debe ser formateado como XX.XXX.XXX-X.").nullable().optional(),
  doctorLicense: z.string().describe("El número de colegiatura (N° Colegiatura) del médico prescriptor.").nullable().optional(),
  doctorSpecialty: z.string().describe("La especialidad del médico prescriptor.").nullable().optional(),

  prescriptionDate: z.string().describe("La fecha en que se emitió la receta en formato AAAA-MM-DD.").nullable().optional(),
  items: z.array(RecipeItemSchema).describe('Un arreglo de medicamentos o ítems prescritos encontrados en la receta.')
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
  prompt: `Eres un experto farmacéutico clínico y especialista en ingreso de datos. Tu tarea es extraer meticulosamente información estructurada de la imagen de una receta médica proporcionada. Tu proceso debe ser:
  1.  **Análisis Inicial**: Lee la receta completa para entender el contexto.
  2.  **Extracción de Campos**: Identifica y extrae los campos de pacientes y médicos como se indica.
  3.  **Procesamiento de Ítems de Medicamentos**: Para cada ítem prescrito, realiza los siguientes sub-pasos:
      a.  **Identificación del Principio Activo**: Extrae el principio activo principal tal como está escrito.
      b.  **Validación del Principio Activo**: Usa la herramienta \`getDrugInfo\` para encontrar el nombre oficial del ingrediente extraído. **DEBES usar el nombre canónico retornado por la herramienta en el campo \`principalActiveIngredient\` de la salida.** Si la herramienta no encuentra una coincidencia, usa tu mejor juicio basado en la imagen.
      c.  **Diferenciar Concentración de Dosis**:
          - **Concentración** es la potencia del producto final preparado (ej., '5%' en una crema, '50mg' por cápsula). Rellena \`concentrationValue\` y \`concentrationUnit\`.
          - **Dosis** es lo que el paciente toma cada vez (ej., '1' cápsula, '1' aplicación). Rellena \`dosageValue\` y \`dosageUnit\`. No los confundas.
      d.  **Rellena todos los demás campos** para el ítem basándote en la receta.

  **Instrucciones de Extracción:**
  - **Capitalización:** Formatea todos los campos de texto con mayúsculas y minúsculas adecuadas (ej., 'Juan Pérez' en lugar de 'JUAN PÉREZ').
  - **Formato de RUT:** Asegúrate de que todos los RUTs estén formateados como XX.XXX.XXX-X.
  - **Formato de Fecha:** La fecha de la receta debe estar en formato AAAA-MM-DD. Asume el año actual si no se especifica.
  - **Omisiones:** Si una pieza de información no es visible, omite su campo correspondiente del JSON de salida. Es preferible omitir un campo a devolver un valor nulo (null).
  - **Idioma:** Toda la información extraída y los valores en el JSON de salida deben estar en **español**.

  Devuelve un único objeto JSON con todos los campos extraídos.

  Imagen de la Receta: {{media url=photoDataUri}}`,
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

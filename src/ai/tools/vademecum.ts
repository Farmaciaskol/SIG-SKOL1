
'use server';
/**
 * @fileOverview A Genkit tool for fetching drug information from the inventory.
 *
 * - getDrugInfo - A tool that returns information about a specific drug.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getInventory } from '@/lib/data'; // Import from data layer

export const getDrugInfo = ai.defineTool(
  {
    name: 'getDrugInfo',
    description: 'Busca información sobre un principio activo específico en el Vademecum (Inventario), incluyendo interacciones, contraindicaciones y dosis estándar.',
    inputSchema: z.object({
      drugName: z.string().describe('El nombre del principio activo a buscar.'),
    }),
    outputSchema: z.object({
      found: z.boolean().describe('Indica si se encontró información para el fármaco.'),
      interactions: z.array(z.string()).optional().describe('Posibles interacciones farmacológicas.'),
      contraindications: z.array(z.string()).optional().describe('Contraindicaciones para el uso del fármaco.'),
      standardDosage: z.string().optional().describe('Información sobre la dosificación estándar o indicaciones principales.'),
    }),
  },
  async (input) => {
    const inventory = await getInventory();
    const drugKey = input.drugName.toLowerCase();
    
    const result = inventory.find(item => item.activePrinciple.toLowerCase() === drugKey);
    
    if (result) {
      // Mapping inventory data to the output schema.
      // This is a simplified mapping. In a real scenario, you might have more structured data.
      return {
        found: true,
        interactions: [], // This field is not in our inventory data model
        contraindications: [], // This field is not in our inventory data model
        standardDosage: result.mainIndications || `Dosis: ${result.doseValue} ${result.doseUnit}, Forma: ${result.pharmaceuticalForm}`,
      };
    } else {
      return {
        found: false,
      };
    }
  }
);

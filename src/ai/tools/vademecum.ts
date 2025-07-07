
'use server';
/**
 * @fileOverview A Genkit tool for fetching drug information from a simulated Chilean Vademecum.
 *
 * - getDrugInfo - A tool that returns information about a specific drug.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { VADEMECUM_DATA } from '@/lib/constants';

export const getDrugInfo = ai.defineTool(
  {
    name: 'getDrugInfo',
    description: 'Busca información sobre un principio activo o nombre de producto en el Vademecum chileno. Devuelve el nombre canónico del principio activo y su registro sanitario.',
    inputSchema: z.object({
      drugName: z.string().describe('El nombre del principio activo o del producto comercial a buscar.'),
    }),
    outputSchema: z.object({
      found: z.boolean().describe('Indica si se encontró información para el fármaco.'),
      canonicalName: z.string().optional().describe('El nombre canónico y oficial del principio activo.'),
      productName: z.string().optional().describe('El nombre del producto comercial, si la búsqueda fue por producto.'),
      sanitaryRegistry: z.string().optional().describe('El número de registro sanitario del ISP.'),
    }),
  },
  async (input) => {
    const searchTerm = input.drugName.toLowerCase().trim();
    
    // Search by product name first, then by active ingredient
    const result = VADEMECUM_DATA.find(drug => 
        drug.productName.toLowerCase().includes(searchTerm) ||
        drug.activeIngredient.toLowerCase().includes(searchTerm)
    );
    
    if (result) {
      return {
        found: true,
        canonicalName: result.activeIngredient,
        productName: result.productName,
        sanitaryRegistry: result.sanitaryRegistry,
      };
    } else {
      return {
        found: false,
      };
    }
  }
);

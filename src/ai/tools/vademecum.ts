
'use server';
/**
 * @fileOverview A Genkit tool for fetching drug information from a simulated Chilean Vademecum.
 *
 * - getDrugInfo - A tool that returns information about a specific drug.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Simulated Chilean Vademecum data. In a real application, this would be an API call or a larger database.
const VADEMECUM_DATA = [
    { productName: "Tapsin 500mg Comprimidos", activeIngredient: "Paracetamol", sanitaryRegistry: "F-12345/21" },
    { productName: "Kitadol 500mg", activeIngredient: "Paracetamol", sanitaryRegistry: "F-54321/20" },
    { productName: "Ibuprofeno 400mg L.CH.", activeIngredient: "Ibuprofeno", sanitaryRegistry: "F-23456/19" },
    { productName: "Niofen 400mg", activeIngredient: "Ibuprofeno", sanitaryRegistry: "F-65432/18" },
    { productName: "Losartan Potásico 50mg", activeIngredient: "Losartán", sanitaryRegistry: "F-34567/22" },
    { productName: "Cozaar 50mg", activeIngredient: "Losartán", sanitaryRegistry: "F-76543/21" },
    { productName: "Eutirox 100mcg", activeIngredient: "Levotiroxina", sanitaryRegistry: "F-45678/20" },
    { productName: "Metformina 850mg", activeIngredient: "Metformina", sanitaryRegistry: "F-56789/19" },
    { productName: "Glafornil 850mg", activeIngredient: "Metformina", sanitaryRegistry: "F-98765/18" },
    { productName: "Amoxicilina 500mg", activeIngredient: "Amoxicilina", sanitaryRegistry: "F-67890/22" },
    { productName: "Clavinex 500/125", activeIngredient: "Amoxicilina/Ácido Clavulánico", sanitaryRegistry: "F-11223/21" },
    { productName: "Atorvastatina 20mg", activeIngredient: "Atorvastatina", sanitaryRegistry: "F-78901/20" },
    { productName: "Lipitor 20mg", activeIngredient: "Atorvastatina", sanitaryRegistry: "F-22334/19" },
    { productName: "Sertralina 50mg", activeIngredient: "Sertralina", sanitaryRegistry: "F-89012/18" },
    { productName: "Altruline 50mg", activeIngredient: "Sertralina", sanitaryRegistry: "F-33445/22" },
    { productName: "Omeprazol 20mg", activeIngredient: "Omeprazol", sanitaryRegistry: "F-90123/21" },
    { productName: "Zotran 20mg", activeIngredient: "Omeprazol", sanitaryRegistry: "F-44556/20" },
    { productName: "Clonazepam 0.5mg", activeIngredient: "Clonazepam", sanitaryRegistry: "F-10293/19", isControlled: true },
    { productName: "Ravotril 0.5mg", activeIngredient: "Clonazepam", sanitaryRegistry: "F-55667/18", isControlled: true },
    { productName: "Alprazolam 0.5mg", activeIngredient: "Alprazolam", sanitaryRegistry: "F-20384/22", isControlled: true },
    { productName: "Minoxidilo 5%", activeIngredient: "Minoxidilo", sanitaryRegistry: "N/A - Preparado Magistral" },
    { productName: "Ácido Retinoico 0.05%", activeIngredient: "Ácido Retinoico", sanitaryRegistry: "N/A - Preparado Magistral" },
    { productName: "Clobetasol Propionato 0.05%", activeIngredient: "Clobetasol Propionato", sanitaryRegistry: "N/A - Preparado Magistral" },
    { productName: "Hidroquinona 4%", activeIngredient: "Hidroquinona", sanitaryRegistry: "N/A - Preparado Magistral" },
    { productName: "Cafeína Anhidra", activeIngredient: "Cafeína", sanitaryRegistry: "N/A - Preparado Magistral" },
    { productName: "Finasterida 1mg", activeIngredient: "Finasterida", sanitaryRegistry: "F-66778/21" },
];

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


'use server';

import type { LiorenProduct, Bodega } from './types';

const API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxMTcxIiwianRpIjoiOTRlY2JjMjc4YjgzNGJkZmEwNGU1ZjNjMGQ4ZmRmNjk4YmZmNWFkOTE3NDEyYTIxMjgxMTI5NjQwMjFhOTBjMmVkYjAwMTBjZGVmZTRmNjciLCJpYXQiOjE3NTE4Mjg5NzYuMjUzNDI4LCJuYmYiOjE3NTE4Mjg5NzYuMjUzNDI5LCJleHAiOjE3ODMzNjQ5NzYuMjUwMTUxLCJzdWIiOiI1OTUxIiwic2NvcGVzIjpbXX0.RIS-rcnMH8zmkpb6AXbESWdWxngXvxquiBn52HV9WNqih5jdI0qgAnBTW7yNr9__tx3-eXAKe3rbhve8xBWHoOnbI2LP0yQ6Gs9h9w15Dy6tbrFZykfqaEdNqeYy3KZr0uiRJEsANGq-kmv2BZDjR3V2sU6FjV0GgleIqrFcxHsn2pgIwueYSZcH-FFo47R0qGixuLlu9QuHROUjf2_jxlXPsBqoCXyZcuC12ivZCKxYMeQaHCet8QyT5rWRuVh0bZfwqTjp2rJoT23gBB2-bQecc-13ExuegyoNFwBp_RsSPZN9p73Ad1GMuxMlbpXYIEYTeo8CZbgM82pVDv-sk3YLNW2mayvMEMoydJkUpgOUrDkSVoQtWM4GCS0im4fbJ04b8Pr2KPTu0kSWgLVQK4zMwkl13GPClD8KqJUUSiKy7VQTyzMt0ywsb2aaWzg7VhQadLXpuPmsJ_TSciuK9eW0z4qLb-BaQVRBYlKSutGBPCfcl6wM3Oyija4WgCAkUBPdIiL740lmO2WUOI8x-tA92Gi-O6sYXK58HMhv4z9NtHi7GcHeuI8KH00G7FhtD_kDYTzonkeRFnUOzcGqsVIMsaPa6txlZtTCFKrgH-f6rI7h40GC5fi9dHXNenW2hMR3AUlWc3stQJeg9JV4ud-aQD0-2pOmCpM-kNvji8o";

/**
 * Fetches data from a Lioren API endpoint.
 * @param url The URL to fetch.
 * @returns The JSON response.
 * @throws An error if the fetch fails or the response is not ok.
 */
async function fetchLiorenAPI(url: string) {
    if (!API_KEY) {
        throw new Error("Lioren API key no está configurada.");
    }
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'application/json'
        },
        cache: 'no-store'
    });
    
    if (response.status === 429) {
      throw new Error("Demasiadas solicitudes a la API de Lioren. Por favor, espere un momento.");
    }

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Lioren API Error:", errorBody);
        throw new Error(`Error de la API de Lioren: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetches all products from Lioren, handling pagination.
 * @returns A promise that resolves to an array of Lioren products.
 */
export async function fetchAllLiorenProducts(): Promise<{ products: LiorenProduct[]; error?: string }> {
    let allProducts: LiorenProduct[] = [];
    let nextUrl: string | null = 'https://www.lioren.cl/api/productos';

    try {
        while (nextUrl) {
            const data = await fetchLiorenAPI(nextUrl);
            const productsOnPage = data?.data || data?.['*'] || (Array.isArray(data) ? data : []);
            allProducts = allProducts.concat(productsOnPage);
            nextUrl = data?.links?.next || null;
        }
        return { products: allProducts };
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo conectar con el servidor de Lioren.";
        console.error("Fallo al obtener todos los productos de Lioren:", error);
        return { products: [], error: message };
    }
}

/**
 * Searches for products in Lioren based on a search term.
 * @param searchTerm The term to search for (e.g., product name).
 * @returns A promise that resolves to the search results.
 */
export async function searchLiorenProducts(searchTerm: string): Promise<{ products: LiorenProduct[]; error?: string }> {
    if (!searchTerm || searchTerm.trim() === '') {
        return { products: [] };
    }

    try {
        const url = new URL('https://www.lioren.cl/api/productos');
        url.searchParams.append('nombre', searchTerm);
        const data = await fetchLiorenAPI(url.toString());
        const products = data?.data || data?.['*'] || (Array.isArray(data) ? data : []);
        return { products };
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo conectar con el servidor de Lioren.";
        console.error("Fallo al buscar productos en Lioren:", error);
        return { products: [], error: message };
    }
}

/**
 * Fetches all registered warehouses from Lioren.
 * @returns A promise that resolves to the list of warehouses.
 */
export async function fetchLiorenWarehouses(): Promise<{ bodegas: Bodega[]; error?: string }> {
    try {
        const data = await fetchLiorenAPI('https://www.lioren.cl/api/bodegas');
        const bodegas = data?.bodegas || (Array.isArray(data) ? data : []);
        return { bodegas };
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo conectar con el servidor de Lioren.";
        console.error("Fallo al obtener bodegas de Lioren:", error);
        return { bodegas: [], error: message };
    }
}

/**
 * Fetches attributes for a specific product from Lioren.
 * @param productId The ID of the product.
 * @returns A promise that resolves to the product attributes.
 */
export async function fetchLiorenProductAttributes(productId: number): Promise<{ attributes: any[]; error?: string }> {
    try {
        const url = `https://www.lioren.cl/api/productos/${productId}/atributos`;
        const data = await fetchLiorenAPI(url);
        // The API returns attributes under the key "*"
        const attributes = data?.data || data?.['*'] || (Array.isArray(data) ? data : []);
        return { attributes };
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo conectar con el servidor de Lioren.";
        console.error(`Fallo al obtener atributos para el producto ${productId} en Lioren:`, error);
        return { attributes: [], error: message };
    }
}

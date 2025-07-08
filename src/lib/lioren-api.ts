'use server';

// Define a type for the raw product from Lioren API
export interface LiorenStock {
  sucursal_id: number;
  nombre: string;
  stock: number;
}
export interface LiorenProduct {
  id: number;
  nombre: string;
  exento: number;
  codigo: string; // SKU
  unidad: string;
  param1: string;
  param2: string;
  param3: string;
  param4: string;
  descripcion?: string;
  activo: number;
  preciocompraneto: number;
  precioventabruto: number;
  cod_imp_venta: string;
  cod_imp_compra: string;
  peso: number;
  largo: string;
  ancho: string;
  alto: string;
  stocks: LiorenStock[];
  atributos: any[];
  otrosprecios: any[];
}

export async function fetchLiorenInventory(): Promise<{ products: LiorenProduct[]; error?: string }> {
  const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxMTcxIiwianRpIjoiOTRlY2JjMjc4YjgzNGJkZmEwNGU1ZjNjMGQ4ZmRmNjk4YmZmNWFkOTE3NDEyYTIxMjgxMTI5NjQwMjFhOTBjMmVkYjAwMTBjZGVmZTRmNjciLCJpYXQiOjE3NTE4Mjg5NzYuMjUzNDI4LCJuYmYiOjE3NTE4Mjg5NzYuMjUzNDI5LCJleHAiOjE3ODMzNjQ5NzYuMjUwMTUxLCJzdWIiOiI1OTUxIiwic2NvcGVzIjpbXX0.RIS-rcnMH8zmkpb6AXbESWdWxngXvxquiBn52HV9WNqih5jdI0qgAnBTW7yNr9__tx3-eXAKe3rbhve8xBWHoOnbI2LP0yQ6Gs9h9w15Dy6tbrFZykfqaEdNqeYy3KZr0uiRJEsANGq-kmv2BZDjR3V2sU6FjV0GgleIqrFcxHsn2pgIwueYSZcH-FFo47R0qGixuLlu9QuHROUjf2_jxlXPsBqoCXyZcuC12ivZCKxYMeQaHCet8QyT5rWRuVh0bZfwqTjp2rJoT23gBB2-bQecc-13ExuegyoNFwBp_RsSPZN9p73Ad1GMuxMlbpXYIEYTeo8CZbgM82pVDv-sk3YLNW2mayvMEMoydJkUpgOUrDkSVoQtWM4GCS0im4fbJ04b8Pr2KPTu0kSWgLVQK4zMwkl13GPClD8KqJUUSiKy7VQTyzMt0ywsb2aaWzg7VhQadLXpuPmsJ_TSciuK9eW0z4qLb-BaQVRBYlKSutGBPCfcl6wM3Oyija4WgCAkUBPdIiL740lmO2WUOI8x-tA92Gi-O6sYXK58HMhv4z9NtHi7GcHeuI8KH00G7FhtD_kDYTzonkeRFnUOzcGqsVIMsaPa6txlZtTCFKrgH-f6rI7h40GC5fi9dHXNenW2hMR3AUlWc3stQJeg9JV4ud-aQD0-2pOmCpM-kNvji8o";
  
  if (!apiKey) {
    return { products: [], error: "Lioren API key no está configurada." };
  }

  const allProducts: LiorenProduct[] = [];
  let page = 1;
  const maxPages = 50; // Safety limit to prevent infinite loops

  try {
    while (page <= maxPages) {
      const response = await fetch(`https://www.lioren.cl/api/productos?page=${page}`, {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        return { products: [], error: `Error de la API de Lioren: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      
      let productsOnPage: LiorenProduct[] = [];
      
      // Lioren API can return products under different keys, try to find the correct one.
      if (data && data.data && Array.isArray(data.data)) {
        productsOnPage = data.data;
      } else if (data && Array.isArray(data['*'])) {
        productsOnPage = data['*'];
      } else if (data && Array.isArray(data)) {
        productsOnPage = data;
      } else {
        if (page === 1) { // If it fails on the first page, it's a structural error
            return { products: [], error: 'La respuesta de la API de Lioren no contiene un listado de productos válido.' };
        } else { // If it fails on a later page, we've probably reached the end
            break;
        }
      }
      
      if (productsOnPage.length === 0) {
        break; // No more products, exit the loop
      }

      allProducts.push(...productsOnPage);
      page++;
    }

    return { products: allProducts };
  } catch (error) {
    console.error("Fallo al conectar con la API de Lioren:", error);
    if (error instanceof Error && error.name === 'AbortError') {
      return { products: [], error: "La conexión con la API de Lioren tardó demasiado y fue cancelada." };
    }
    return { products: [], error: "No se pudo conectar con el servidor de Lioren. Verifique su conexión a internet." };
  }
}

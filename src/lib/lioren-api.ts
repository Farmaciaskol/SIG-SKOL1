
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

export interface Bodega {
    id: number;
    nombre: string;
    sucursal_id: number | null;
}

const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxMTcxIiwianRpIjoiOTRlY2JjMjc4YjgzNGJkZmEwNGU1ZjNjMGQ4ZmRmNjk4YmZmNWFkOTE3NDEyYTIxMjgxMTI5NjQwMjFhOTBjMmVkYjAwMTBjZGVmZTRmNjciLCJpYXQiOjE3NTE4Mjg5NzYuMjUzNDI4LCJuYmYiOjE3NTE4Mjg5NzYuMjUzNDI5LCJleHAiOjE3ODMzNjQ5NzYuMjUwMTUxLCJzdWIiOiI1OTUxIiwic2NvcGVzIjpbXX0.RIS-rcnMH8zmkpb6AXbESWdWxngXvxquiBn52HV9WNqih5jdI0qgAnBTW7yNr9__tx3-eXAKe3rbhve8xBWHoOnbI2LP0yQ6Gs9h9w15Dy6tbrFZykfqaEdNqeYy3KZr0uiRJEsANGq-kmv2BZDjR3V2sU6FjV0GgleIqrFcxHsn2pgIwueYSZcH-FFo47R0qGixuLlu9QuHROUjf2_jxlXPsBqoCXyZcuC12ivZCKxYMeQaHCet8QyT5rWRuVh0bZfwqTjp2rJoT23gBB2-bQecc-13ExuegyoNFwBp_RsSPZN9p73Ad1GMuxMlbpXYIEYTeo8CZbgM82pVDv-sk3YLNW2mayvMEMoydJkUpgOUrDkSVoQtWM4GCS0im4fbJ04b8Pr2KPTu0kSWgLVQK4zMwkl13GPClD8KqJUUSiKy7VQTyzMt0ywsb2aaWzg7VhQadLXpuPmsJ_TSciuK9eW0z4qLb-BaQVRBYlKSutGBPCfcl6wM3Oyija4WgCAkUBPdIiL740lmO2WUOI8x-tA92Gi-O6sYXK58HMhv4z9NtHi7GcHeuI8KH00G7FhtD_kDYTzonkeRFnUOzcGqsVIMsaPa6txlZtTCFKrgH-f6rI7h40GC5fi9dHXNenW2hMR3AUlWc3stQJeg9JV4ud-aQD0-2pOmCpM-kNvji8o";

export async function fetchRawInventoryFromLioren(searchTerm?: string): Promise<LiorenProduct[]> {
  if (!apiKey) {
    console.warn("Lioren API key is not configured. Skipping API fetch.");
    return [];
  }

  const url = 'https://www.lioren.cl/api/productos';

  try {
    const response = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.warn(`[PRUEBA DE CONEXIÓN] Lioren API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    let allProducts: LiorenProduct[] = [];
    if (Array.isArray(data)) {
      allProducts = data as LiorenProduct[];
    } else if (data && Array.isArray(data['*'])) {
      allProducts = data['*'] as LiorenProduct[];
    } else {
       console.warn("[PRUEBA DE CONEXIÓN] La API de Lioren respondió correctamente, pero no se encontró la lista de productos (ni directa ni en clave '*'). Respuesta recibida:", data);
       return [];
    }
    
    // Filter the results on our side to allow for partial matches
    if (searchTerm && searchTerm.trim() !== '') {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return allProducts.filter(product => 
            product.nombre.toLowerCase().includes(lowerCaseSearchTerm) ||
            product.codigo.toLowerCase().includes(lowerCaseSearchTerm)
        );
    }
    
    // If no search term, return all products. 
    // The UI should ideally prevent this for performance reasons.
    return allProducts;

  } catch (error) {
    console.warn("[PRUEBA DE CONEXIÓN] Fallo al conectar con la API de Lioren. Puede ser un problema de red o de la API misma.", error);
    return [];
  }
}


export async function fetchWarehousesFromLioren(): Promise<Bodega[]> {
    if (!apiKey) {
        console.warn("Lioren API key is not configured. Skipping API fetch.");
        return [];
    }

    const url = 'https://www.lioren.cl/api/bodegas';

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.warn(`Lioren API error (warehouses): ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();

        // As per documentation, the warehouses are in a "bodegas" array
        if (data && Array.isArray(data.bodegas)) {
            return data.bodegas as Bodega[];
        }

        console.warn("Lioren API response for warehouses did not contain a 'bodegas' array. Response received:", data);
        return [];

    } catch (error) {
        console.warn("Failed to fetch warehouses from Lioren.", error);
        return [];
    }
}

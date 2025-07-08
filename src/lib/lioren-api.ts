
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
    sucursal_id?: number | null;
}


const API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxMTcxIiwianRpIjoiOTRlY2JjMjc4YjgzNGJkZmEwNGU1ZjNjMGQ4ZmRmNjk4YmZmNWFkOTE3NDEyYTIxMjgxMTI5NjQwMjFhOTBjMmVkYjAwMTBjZGVmZTRmNjciLCJpYXQiOjE3NTE4Mjg5NzYuMjUzNDI4LCJuYmYiOjE3NTE4Mjg5NzYuMjUzNDI5LCJleHAiOjE3ODMzNjQ5NzYuMjUwMTUxLCJzdWIiOiI1OTUxIiwic2NvcGVzIjpbXX0.RIS-rcnMH8zmkpb6AXbESWdWxngXvxquiBn52HV9WNqih5jdI0qgAnBTW7yNr9__tx3-eXAKe3rbhve8xBWHoOnbI2LP0yQ6Gs9h9w15Dy6tbrFZykfqaEdNqeYy3KZr0uiRJEsANGq-kmv2BZDjR3V2sU6FjV0GgleIqrFcxHsn2pgIwueYSZcH-FFo47R0qGixuLlu9QuHROUjf2_jxlXPsBqoCXyZcuC12ivZCKxYMeQaHCet8QyT5rWRuVh0bZfwqTjp2rJoT23gBB2-bQecc-13ExuegyoNFwBp_RsSPZN9p73Ad1GMuxMlbpXYIEYTeo8CZbgM82pVDv-sk3YLNW2mayvMEMoydJkUpgOUrDkSVoQtWM4GCS0im4fbJ04b8Pr2KPTu0kSWgLVQK4zMwkl13GPClD8KqJUUSiKy7VQTyzMt0ywsb2aaWzg7VhQadLXpuPmsJ_TSciuK9eW0z4qLb-BaQVRBYlKSutGBPCfcl6wM3Oyija4WgCAkUBPdIiL740lmO2WUOI8x-tA92Gi-O6sYXK58HMhv4z9NtHi7GcHeuI8KH00G7FhtD_kDYTzonkeRFnUOzcGqsVIMsaPa6txlZtTCFKrgH-f6rI7h40GC5fi9dHXNenW2hMR3AUlWc3stQJeg9JV4ud-aQD0-2pOmCpM-kNvji8o";

export async function fetchLiorenWarehouses(): Promise<{ bodegas: Bodega[]; error?: string }> {
  if (!API_KEY) {
    return { bodegas: [], error: "Lioren API key no está configurada." };
  }

  try {
    const response = await fetch('https://www.lioren.cl/api/bodegas', {
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return { bodegas: [], error: `Error de la API de Lioren: ${response.status} ${response.statusText}` };
    }

    const data = await response.json();
    
    let warehouses: Bodega[] = [];
    if (data && data.bodegas && Array.isArray(data.bodegas)) {
        warehouses = data.bodegas;
    } else if (Array.isArray(data)) { // Handle case where the response is a direct array
        warehouses = data;
    } else {
        console.warn("La respuesta de la API de Bodegas de Lioren no tiene el formato esperado.", data);
    }
    
    return { bodegas: warehouses };
  } catch (error) {
    console.error("Fallo al conectar con la API de Lioren para obtener bodegas:", error);
    return { bodegas: [], error: "No se pudo conectar con el servidor de Lioren. Verifique su conexión a internet." };
  }
}

// New function to fetch ALL products with pagination
export async function fetchAllLiorenProducts(): Promise<{ products: LiorenProduct[]; error?: string }> {
  if (!API_KEY) {
    return { products: [], error: "Lioren API key no está configurada." };
  }

  let allProducts: LiorenProduct[] = [];
  let nextUrl: string | null = 'https://www.lioren.cl/api/productos';

  try {
    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: { 
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        return { products: [], error: `Error de la API de Lioren: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      
      let productsOnPage: LiorenProduct[] = [];
      if (data && data.data && Array.isArray(data.data)) {
        productsOnPage = data.data;
      } else if (data && Array.isArray(data['*'])) {
        productsOnPage = data['*'];
      } else {
         console.warn("La respuesta de la API de Lioren no tiene el formato esperado en `data` o `*`.", data);
      }
      
      allProducts = allProducts.concat(productsOnPage);
      nextUrl = data.links?.next || null;
    }
    return { products: allProducts };
  } catch (error) {
    console.error("Fallo al conectar con la API de Lioren:", error);
    return { products: [], error: "No se pudo conectar con el servidor de Lioren. Verifique su conexión a internet." };
  }
}

// Renamed function for searching
export async function searchLiorenProducts(searchTerm: string): Promise<{ products: LiorenProduct[]; error?: string }> {
  if (!API_KEY) {
    return { products: [], error: "Lioren API key no está configurada." };
  }

  if (!searchTerm || searchTerm.trim() === '') {
    return { products: [] };
  }

  try {
    const url = new URL('https://www.lioren.cl/api/productos');
    url.searchParams.append('nombre', searchTerm);
    
    const response = await fetch(url.toString(), {
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (response.status === 429) {
      return { products: [], error: `Demasiadas solicitudes a la API de Lioren. Por favor, espere un momento antes de volver a buscar.` };
    }
    
    if (!response.ok) {
      return { products: [], error: `Error de la API de Lioren: ${response.status} ${response.statusText}` };
    }

    const data = await response.json();
    
    let products: LiorenProduct[] = [];
    if (data && data.data && Array.isArray(data.data)) {
      products = data.data; // Standard paginated response
    } else if (data && Array.isArray(data['*'])) {
      products = data['*']; // Non-standard paginated response
    } else if (Array.isArray(data)) {
      products = data; // Direct array response
    } else {
      console.warn("La respuesta de búsqueda de la API de Lioren no contiene un listado de productos válido.", data);
    }

    return { products };
  } catch (error) {
    console.error("Fallo al conectar con la API de Lioren:", error);
    if (error instanceof Error && error.name === 'AbortError') {
      return { products: [], error: "La conexión con la API de Lioren tardó demasiado y fue cancelada." };
    }
    return { products: [], error: "No se pudo conectar con el servidor de Lioren. Verifique su conexión a internet." };
  }
}

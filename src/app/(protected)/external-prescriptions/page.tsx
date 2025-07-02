'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  PlusCircle,
  Pencil,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { getExternalPharmacies, ExternalPharmacy } from '@/lib/data';

export default function ExternalPrescriptionsPage() {
  const [pharmacies, setPharmacies] = useState<ExternalPharmacy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const pharmaciesData = await getExternalPharmacies();
        setPharmacies(pharmaciesData);
      } catch (error) {
        console.error("Failed to fetch external pharmacies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const PharmacyActions = ({ pharmacyId }: { pharmacyId: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="flex items-center cursor-pointer w-full">
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 flex items-center cursor-pointer">
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Gestión de Recetarios Externos</h2>
          <p className="text-muted-foreground">
            Añade, edita y gestiona los recetarios con los que colaboras.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Recetario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Recetarios</CardTitle>
          <CardDescription>
            Un total de {pharmacies.length} recetarios externos registrados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p>Cargando recetarios...</p>
            </div>
          ) : pharmacies.length === 0 ? (
             <div className="flex flex-col items-center justify-center text-center py-16 mt-8 shadow-none border-dashed rounded-lg">
                <Warehouse className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No hay recetarios externos</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                Empieza añadiendo el primer recetario para poder asignarlo a las recetas.
                </p>
                <Button className="mt-6">
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Primer Recetario
                </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Recetario</TableHead>
                  <TableHead className="w-[100px] text-right">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pharmacies.map((pharmacy) => (
                  <TableRow key={pharmacy.id}>
                    <TableCell className="font-medium">{pharmacy.name}</TableCell>
                    <TableCell className="text-right">
                      <PharmacyActions pharmacyId={pharmacy.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
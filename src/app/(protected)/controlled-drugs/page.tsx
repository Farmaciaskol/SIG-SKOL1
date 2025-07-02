
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Eye, Star, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ControlledDrugsPage() {
  const [logEntries, setLogEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you would fetch the controlled substance log here.
    // For now, we'll just set loading to false with an empty array.
    setLoading(false);
  }, []);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Libro de Control de Sustancias</h2>
          <p className="text-muted-foreground">
            Registro auditable y seguro de dispensaciones de psicotrópicos y estupefacientes.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Registrar Venta Directa
        </Button>
      </div>

       <div className="grid gap-4 md:grid-cols-3">
        <Card>
            <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Dispensaciones</p>
                <p className="text-2xl font-bold">0</p>
            </CardContent>
        </Card>
        <Card>
             <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Psicotrópicos</p>
                <p className="text-2xl font-bold">0</p>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Estupefacientes</p>
                <p className="text-2xl font-bold">0</p>
            </CardContent>
        </Card>
      </div>

       <Card>
        <CardContent className="p-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Buscar por folio, paciente, médico, medicamento..."
                className="pl-8 w-full"
                />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Folio Interno</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Médico</TableHead>
                <TableHead>Medicamento</TableHead>
                <TableHead>Cant.</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Folio Receta</TableHead>
                <TableHead>Adjunto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : logEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No hay registros en el libro de control.
                  </TableCell>
                </TableRow>
              ) : (
                <></> // Rows will be mapped here
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

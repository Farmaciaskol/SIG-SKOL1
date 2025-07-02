'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  FileX,
} from 'lucide-react';
import { getRecipes, getPatients, Recipe, Patient, RecipeStatus } from '@/lib/data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusColors: Record<RecipeStatus, string> = {
  [RecipeStatus.PendingValidation]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [RecipeStatus.Validated]: 'bg-blue-100 text-blue-800 border-blue-200',
  [RecipeStatus.Rejected]: 'bg-red-100 text-red-800 border-red-200',
  [RecipeStatus.Preparation]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [RecipeStatus.QualityControl]: 'bg-purple-100 text-purple-800 border-purple-200',
  [RecipeStatus.Dispensed]: 'bg-green-100 text-green-800 border-green-200',
  [RecipeStatus.Cancelled]: 'bg-gray-100 text-gray-800 border-gray-200',
};

const RecipeStatusBadge = ({ status }: { status: RecipeStatus }) => (
  <Badge
    variant="outline"
    className={`font-normal ${statusColors[status]}`}
  >
    {status}
  </Badge>
);

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [recipesData, patientsData] = await Promise.all([
          getRecipes(),
          getPatients(),
        ]);
        setRecipes(recipesData);
        setPatients(patientsData);
      } catch (error) {
        console.error("Failed to fetch recipes data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getPatientName = (patientId: string) => {
    return patients.find((p) => p.id === patientId)?.name || 'N/A';
  };
  
  const filteredRecipes = recipes
    .filter((recipe) => {
      if (statusFilter !== 'all' && recipe.status !== statusFilter) {
        return false;
      }
      if (searchTerm) {
        const patientName = getPatientName(recipe.patientId).toLowerCase();
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return (
          recipe.id.toLowerCase().includes(lowerCaseSearchTerm) ||
          patientName.includes(lowerCaseSearchTerm)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Gestión de Recetas</h2>
          <p className="text-muted-foreground">
            Visualiza, filtra y gestiona todas las recetas del sistema.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/recipes/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Nueva Receta
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por ID, paciente..."
                className="pl-8 w-full md:w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-1 w-full md:w-auto md:flex-initial">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.values(RecipeStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p>Cargando recetas...</p>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
               <FileX className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">No se encontraron recetas</h3>
              <p className="text-muted-foreground mt-2">
                Intenta ajustar tu búsqueda o filtros, o crea una nueva receta.
              </p>
              <Button asChild className="mt-4">
                 <Link href="/recipes/new">
                   <PlusCircle className="mr-2 h-4 w-4" /> Crear Receta
                 </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Receta</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-medium">{recipe.id}</TableCell>
                      <TableCell>{getPatientName(recipe.patientId)}</TableCell>
                      <TableCell>
                        {format(new Date(recipe.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <RecipeStatusBadge status={recipe.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/recipes/${recipe.id}`} className="flex items-center cursor-pointer w-full">
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 flex items-center cursor-pointer">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

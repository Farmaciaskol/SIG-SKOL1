'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  DropdownMenuSeparator,
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
  Eye,
  Copy,
  Printer
} from 'lucide-react';
import { getRecipes, getPatients, Recipe, Patient, RecipeStatus } from '@/lib/data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusColors: Record<RecipeStatus, string> = {
  [RecipeStatus.PendingValidation]: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
  [RecipeStatus.Validated]: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100',
  [RecipeStatus.Rejected]: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
  [RecipeStatus.Preparation]: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
  [RecipeStatus.QualityControl]: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100',
  [RecipeStatus.Dispensed]: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
  [RecipeStatus.Cancelled]: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100',
};

const RecipeStatusBadge = ({ status }: { status: RecipeStatus }) => (
  <Badge
    variant="outline"
    className={`font-semibold text-xs ${statusColors[status]}`}
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

  const RecipeActions = ({ recipeId }: { recipeId: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/recipes/${recipeId}`} className="flex items-center cursor-pointer w-full">
            <Eye className="mr-2 h-4 w-4" />
            Ver Detalle
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/recipes/${recipeId}`} className="flex items-center cursor-pointer w-full">
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center cursor-pointer w-full">
            <Copy className="mr-2 h-4 w-4" />
            Re-preparar
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center cursor-pointer w-full">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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
          <h2 className="text-3xl font-bold tracking-tight font-headline">Gestión de Recetas</h2>
          <p className="text-muted-foreground">
            Visualiza, filtra y gestiona todas las recetas del sistema.
          </p>
        </div>
        <Button asChild>
            <Link href="/recipes/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Receta
            </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
            type="search"
            placeholder="Buscar por ID, paciente..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="w-full md:w-auto">
            <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
            >
            <SelectTrigger className="w-full md:w-[220px]">
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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p>Cargando recetas...</p>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center text-center py-16 mt-8 shadow-none border-dashed">
            <FileX className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No se encontraron recetas</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
            Intenta ajustar tu búsqueda o filtros, o crea una nueva receta para empezar.
            </p>
            <Button asChild className="mt-6">
                <Link href="/recipes/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Crear Primera Receta
                </Link>
            </Button>
        </Card>
      ) : (
        <>
            {/* Desktop Table View */}
            <Card className="hidden md:block">
                <CardContent className="p-0">
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
                            <TableRow key={recipe.id} className="hover:bg-muted/50">
                            <TableCell className="font-mono text-primary">{recipe.id}</TableCell>
                            <TableCell className="font-medium">{getPatientName(recipe.patientId)}</TableCell>
                            <TableCell>
                                {format(new Date(recipe.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                            </TableCell>
                            <TableCell>
                                <RecipeStatusBadge status={recipe.status} />
                            </TableCell>
                            <TableCell className="text-right">
                                <RecipeActions recipeId={recipe.id} />
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredRecipes.map((recipe) => (
                <Card key={recipe.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-primary font-mono">{recipe.id}</p>
                                <CardTitle className="text-lg">{getPatientName(recipe.patientId)}</CardTitle>
                            </div>
                            <RecipeActions recipeId={recipe.id} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Estado</span>
                            <RecipeStatusBadge status={recipe.status} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Creada</span>
                            <span>{format(new Date(recipe.createdAt), "dd/MM/yyyy", { locale: es })}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
            </div>
        </>
      )}
    </div>
  );
}

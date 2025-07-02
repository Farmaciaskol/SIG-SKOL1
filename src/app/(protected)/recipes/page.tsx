
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { getRecipes, getPatients, deleteRecipe, Recipe, Patient, RecipeStatus } from '@/lib/data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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
  const router = useRouter();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);

  const fetchData = useCallback(async () => {
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
      toast({ title: 'Error', description: 'No se pudieron cargar los datos de las recetas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getPatientName = (patientId: string) => {
    return patients.find((p) => p.id === patientId)?.name || 'N/A';
  };

  const handleReprepare = (recipeId: string) => {
    router.push(`/recipes/new?copyFrom=${recipeId}`);
  };

  const handleConfirmDelete = async () => {
    if (!recipeToDelete) return;
    try {
        await deleteRecipe(recipeToDelete.id);
        toast({ title: 'Receta Eliminada', description: `La receta ${recipeToDelete.id} ha sido eliminada.` });
        setRecipeToDelete(null);
        fetchData();
    } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar la receta.', variant: 'destructive' });
    }
  };

  const handlePrint = () => {
    toast({ title: 'No implementado', description: 'La función de impresión estará disponible próximamente.' });
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

  const RecipeActions = ({ recipe }: { recipe: Recipe }) => (
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
            <Eye className="mr-2 h-4 w-4" />
            Ver Detalle
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/recipes/${recipe.id}`} className="flex items-center cursor-pointer w-full">
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center cursor-pointer w-full" onClick={() => handleReprepare(recipe.id)}>
            <Copy className="mr-2 h-4 w-4" />
            Re-preparar
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center cursor-pointer w-full" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 flex items-center cursor-pointer" onClick={() => setRecipeToDelete(recipe)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6 p-4 md:p-8">
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
        <Card className="py-16 mt-8 shadow-none border-dashed">
            <div className="flex flex-col items-center justify-center text-center">
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
            </div>
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
                                <RecipeActions recipe={recipe} />
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
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Link href={`/recipes/${recipe.id}`} className="font-semibold text-primary hover:underline">
                      {recipe.id}
                    </Link>
                    <RecipeStatusBadge status={recipe.status} />
                  </CardHeader>
                  <CardContent className="space-y-1 pb-4">
                    <p className="font-bold text-lg">{getPatientName(recipe.patientId)}</p>
                    <p className="text-sm text-muted-foreground">
                      {recipe.items[0]?.principalActiveIngredient || 'Múltiples ítems'}
                    </p>
                     <p className="text-xs text-muted-foreground pt-1">
                        Creada: {format(new Date(recipe.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                  </CardContent>
                  <CardFooter className="flex justify-between items-center p-3 bg-muted/50">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                        <Link href={`/recipes/${recipe.id}`}><Eye className="h-5 w-5"/></Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                        <Link href={`/recipes/${recipe.id}`}><Pencil className="h-5 w-5"/></Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-100" onClick={() => setRecipeToDelete(recipe)}>
                          <Trash2 className="h-5 w-5"/>
                      </Button>
                    </div>
                    <Button size="sm" onClick={() => handleReprepare(recipe.id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Re-preparar
                    </Button>
                  </CardFooter>
                </Card>
            ))}
            </div>
        </>
      )}

      <AlertDialog open={!!recipeToDelete} onOpenChange={(open) => !open && setRecipeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro que deseas eliminar esta receta?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. La receta con ID <span className="font-bold font-mono">{recipeToDelete?.id}</span> será eliminada permanentemente.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRecipeToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

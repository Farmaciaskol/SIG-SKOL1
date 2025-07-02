
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Role, getUsers, getRoles } from '@/lib/data';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersData, rolesData] = await Promise.all([getUsers(), getRoles()]);
        setUsers(usersData);
        setRoles(rolesData);
      } catch (error) {
        console.error("Failed to fetch user management data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getRoleName = (roleId: string) => {
    return roles.find(r => r.id === roleId)?.name || 'Sin Rol';
  };

  const UserActions = () => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
        <DropdownMenuItem>Editar</DropdownMenuItem>
        <DropdownMenuItem>Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">Gestión de Usuarios</h2>
            <p className="text-muted-foreground">Añade, edita y gestiona los roles y permisos de los usuarios del sistema.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Usuario
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          {loading ? (
             <div className="flex items-center justify-center h-64">
                <p>Cargando usuarios...</p>
            </div>
          ) : (
            <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead className="text-right">
                            <span className="sr-only">Acciones</span>
                        </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                            <Badge variant="secondary">{getRoleName(user.roleId)}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <UserActions />
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {users.map((user) => (
                        <Card key={user.id}>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-base">{user.name}</CardTitle>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="md:hidden">
                                        <UserActions />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardFooter className="bg-muted/50 p-3 flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Rol Asignado</span>
                                <Badge variant="secondary">{getRoleName(user.roleId)}</Badge>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

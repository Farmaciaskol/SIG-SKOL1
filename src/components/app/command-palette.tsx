

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Users,
  Stethoscope,
  LayoutDashboard,
  Truck,
  ShieldAlert,
  Lock,
  Settings,
  UserCog,
  BarChart2,
  Search,
  Building2,
  Package,
  CalendarDays,
  DollarSign,
  Inbox,
  Wand2,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { DialogTitle } from '@/components/ui/dialog';
import { getPatients, getDoctors, getRecipes, Patient, Doctor } from '@/lib/data';
import type { Recipe } from '@/lib/types';

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  React.useEffect(() => {
    if (open) {
      const fetchData = async () => {
        const [patientsData, doctorsData, recipesData] = await Promise.all([
          getPatients(),
          getDoctors(),
          getRecipes(),
        ]);
        setPatients(patientsData);
        setDoctors(doctorsData);
        setRecipes(recipesData);
      };
      fetchData();
    }
  }, [open]);

  // This is the key change: a function that returns the event handler.
  const handleSelect = (url: string) => {
    return () => {
      router.push(url);
      setOpen(false);
    }
  };
  
  const getPatientName = (patientId: string) => {
    return patients.find(p => p.id === patientId)?.name || 'N/A';
  }

  const pages = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/portal-inbox', label: 'Bandeja Portal', icon: Inbox },
      { href: '/recipes', label: 'Recetas', icon: FileText },
      { href: '/patients', label: 'Pacientes', icon: Users },
      { href: '/doctors', label: 'Médicos', icon: Stethoscope },
      { href: '/external-prescriptions', label: 'Recetarios', icon: Building2 },
      { href: '/inventory', label: 'Inventario', icon: Package },
      { href: '/monthly-dispensing', label: 'Dispensación Mensual', icon: CalendarDays },
      { href: '/dispatch-management', label: 'Gestión Despachos', icon: Truck },
      { href: '/pharmacovigilance', label: 'Farmacovigilancia', icon: ShieldAlert },
      { href: '/controlled-drugs', label: 'Controlados', icon: Lock },
      { href: '/financial-management', label: 'Gestión Financiera', icon: DollarSign },
      { href: '/reports', label: 'Reportes', icon: BarChart2 },
      { href: '/user-management', label: 'Gestión Usuarios', icon: UserCog },
      { href: '/settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground w-full h-9 px-3 bg-background rounded-md flex items-center justify-start border border-input shadow-sm hover:bg-accent"
      >
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <span className="truncate">Buscar...</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Paleta de Comandos</DialogTitle>
        <CommandInput placeholder="Escriba un comando o busque..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          
          <CommandGroup heading="Recetas">
            {recipes.map((recipe) => (
              <CommandItem
                key={recipe.id}
                value={`receta ${recipe.id} ${getPatientName(recipe.patientId)} ${recipe.items[0]?.principalActiveIngredient}`}
                onSelect={handleSelect(`/recipes/${recipe.id}`)}
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>Receta: {recipe.id.substring(0,8)}...</span>
                <span className="text-xs text-muted-foreground ml-2">{getPatientName(recipe.patientId)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandGroup heading="Pacientes">
            {patients.map((patient) => (
              <CommandItem
                key={patient.id}
                value={`paciente ${patient.name} ${patient.rut}`}
                onSelect={handleSelect(`/patients/${patient.id}`)}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>{patient.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{patient.rut}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Médicos">
            {doctors.map((doctor) => (
              <CommandItem
                key={doctor.id}
                value={`doctor ${doctor.name} ${doctor.specialty}`}
                onSelect={handleSelect(`/doctors/${doctor.id}`)}
              >
                <Stethoscope className="mr-2 h-4 w-4" />
                <span>{doctor.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{doctor.specialty}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Páginas">
            {pages.map((page) => (
               <CommandItem
                key={page.href}
                value={page.label}
                onSelect={handleSelect(page.href)}
              >
                <page.icon className="mr-2 h-4 w-4" />
                <span>{page.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

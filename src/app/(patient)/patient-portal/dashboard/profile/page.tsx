
'use client';

import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Mail, Phone, MapPin, AlertTriangle, User, Heart, ShieldAlert, Pill, Stethoscope, Loader2, Palette, Save, Home, LogOut, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';
import { Doctor } from '@/lib/types';
import { getDoctor, updatePatient } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PREDEFINED_AVATARS, getAvatar } from '@/components/app/predefined-avatars';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';


export default function PatientProfilePage() {
  const { patient, refreshPatient, logout } = usePatientAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | undefined>(patient?.avatar);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      if (patient?.associatedDoctorIds && patient.associatedDoctorIds.length > 0) {
        setLoadingDoctors(true);
        try {
          const fetchedDoctors = await Promise.all(
            patient.associatedDoctorIds.map(id => getDoctor(id))
          );
          setDoctors(fetchedDoctors.filter((doc): doc is Doctor => doc !== null));
        } catch (error) {
          toast({ title: 'Error', description: 'No se pudieron cargar los médicos tratantes.', variant: 'destructive' });
        } finally {
          setLoadingDoctors(false);
        }
      } else {
        setLoadingDoctors(false);
      }
    };
    if (patient) {
      fetchDoctors();
      setSelectedAvatar(patient.avatar);
    }
  }, [patient, toast]);
  
  const handleSaveAvatar = async () => {
    if (!patient || selectedAvatar === undefined) return;
    setIsSaving(true);
    try {
        await updatePatient(patient.id, { avatar: selectedAvatar });
        toast({ title: 'Avatar Actualizado', description: 'Tu nuevo avatar ha sido guardado.' });
        setIsAvatarDialogOpen(false);
        await refreshPatient(patient.id);
    } catch(error) {
        toast({ title: 'Error', description: 'No se pudo guardar el avatar.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };


  if (!patient) {
    return <div className="flex items-center justify-center pt-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const DisplayAvatar = patient.avatar ? getAvatar(patient.avatar) : (<AvatarFallback className="text-3xl font-bold">{patient.name.charAt(0)}</AvatarFallback>);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold font-headline">Mi Perfil</h1>
      </div>

      <Card>
        <CardHeader className="items-center text-center">
            <div className="relative group">
                <Avatar className="w-24 h-24 text-3xl mb-4 border-2 border-primary/20">
                    {DisplayAvatar}
                </Avatar>
                <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="absolute bottom-4 -right-2 h-8 w-8 rounded-full">
                            <Palette className="h-4 w-4"/>
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Elige tu Avatar</DialogTitle>
                            <DialogDescription>Selecciona una imagen de la lista para personalizar tu perfil.</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-4">
                            {Object.entries(PREDEFINED_AVATARS).map(([id, svg]) => (
                                <div
                                    key={id}
                                    onClick={() => setSelectedAvatar(id)}
                                    className={cn(
                                        "p-2 border-2 rounded-lg cursor-pointer transition-all",
                                        selectedAvatar === id ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-muted-foreground/50"
                                    )}
                                >
                                <div className="aspect-square">{svg}</div>
                                </div>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsAvatarDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveAvatar} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <Save className="mr-2 h-4 w-4"/>
                                Guardar Avatar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
          <CardTitle className="text-2xl">{patient.name}</CardTitle>
          <CardDescription>RUT: {patient.rut}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">Género: {patient.gender || 'No especificado'}</span></div>
              <div className="flex items-center gap-3"><Heart className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">Paciente Crónico: <Badge variant={patient.isChronic ? "secondary" : "outline"}>{patient.isChronic ? 'Sí' : 'No'}</Badge></span></div>
              <div className="flex items-center gap-3"><Home className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">Atención Domiciliaria: <Badge variant={patient.isHomeCare ? "secondary" : "outline"}>{patient.isHomeCare ? 'Sí' : 'No'}</Badge></span></div>
            </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Link href="/patient-portal/dashboard/payments" className="block">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary"/>
                <p className="font-semibold">Pagos y Costos</p>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer" onClick={() => { logout(); router.push('/patient-portal/login'); }}>
              <div className="flex items-center gap-3">
                <LogOut className="h-5 w-5 text-destructive"/>
                <p className="font-semibold text-destructive">Cerrar Sesión</p>
              </div>
            </CardHeader>
        </Card>
      </div>

       <Accordion type="multiple" defaultValue={['contact', 'clinical', 'doctors']} className="w-full space-y-4">
         <Card>
           <AccordionItem value="contact" className="border-b-0">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline p-4">Información de Contacto</AccordionTrigger>
              <AccordionContent className="p-4 pt-0 space-y-3 text-sm">
                <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.email || 'No registrado'}</span></div>
                <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.phone || 'No registrado'}</span></div>
                {patient.address && <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-1" /><span className="text-foreground">{patient.address}</span></div>}
              </AccordionContent>
           </AccordionItem>
         </Card>
         <Card>
            <AccordionItem value="clinical" className="border-b-0">
               <AccordionTrigger className="text-lg font-semibold hover:no-underline p-4">Información Clínica</AccordionTrigger>
               <AccordionContent className="p-4 pt-0 space-y-4">
                  <div className="space-y-2 text-sm">
                    <p className="font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground" />Alergias Conocidas</p>
                    {patient.allergies && patient.allergies.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pl-7">
                              {patient.allergies.map((allergy) => <Badge key={allergy} variant="destructive">{allergy}</Badge>)}
                          </div>
                      ) : (
                          <p className="text-muted-foreground pl-7 text-xs">No hay alergias registradas.</p>
                      )}
                  </div>
                  <Separator />
                   <div className="space-y-2 text-sm">
                    <p className="font-medium flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-muted-foreground" />Reacciones Adversas</p>
                    {patient.adverseReactions && patient.adverseReactions.length > 0 ? (
                          <ul className="list-disc pl-12 space-y-1">
                            {patient.adverseReactions.map((reaction, index) => (
                              <li key={index} className="text-foreground">A <span className="font-semibold">{reaction.medication}</span>: {reaction.description}</li>
                            ))}
                          </ul>
                      ) : ( <p className="text-muted-foreground pl-7 text-xs">No hay reacciones adversas registradas.</p> )}
                  </div>
               </AccordionContent>
            </AccordionItem>
         </Card>
          <Card>
            <AccordionItem value="doctors" className="border-b-0">
               <AccordionTrigger className="text-lg font-semibold hover:no-underline p-4">Médicos Tratantes</AccordionTrigger>
               <AccordionContent className="p-4 pt-0">
                  {loadingDoctors ? ( <div className="flex items-center justify-center h-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : doctors.length > 0 ? (
                    <ul className="space-y-3">
                      {doctors.map(doctor => (
                        <li key={doctor.id} className="flex flex-col p-3 bg-muted/50 rounded-lg">
                          <p className="font-semibold text-foreground">{doctor.name}</p>
                          <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                        </li>
                      ))}
                    </ul>
                  ) : ( <p className="text-sm text-muted-foreground text-center py-4">No tienes médicos tratantes asociados.</p> )}
               </AccordionContent>
            </AccordionItem>
         </Card>
       </Accordion>

    </div>
  );
}


'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAllOrders,
  getPatients,
  updateOrder,
  type Order,
  type Patient,
} from '@/lib/data';
import { OrderStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Truck, Check, PackageSearch, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type OrderWithPatient = Order & { patient: Patient | undefined };

const OrderCard = ({ order, onStatusChange }: { order: OrderWithPatient; onStatusChange: (orderId: string, newStatus: OrderStatus) => void; }) => {
    if (!order.patient) return null;

    const isReadyForDispatch = order.status === OrderStatus.Shipped;
    const isInTransit = order.status === OrderStatus.InTransit;
    
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{order.patient.name}</CardTitle>
                    <p className="text-sm font-mono text-muted-foreground">#{order.id}</p>
                </div>
                <CardDescription className="flex items-center gap-2 pt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {order.patient.address || 'Dirección no especificada'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm font-semibold mb-2">Contenido del Pedido:</p>
                <ul className="space-y-1.5 text-sm">
                    {order.items.map(item => (
                        <li key={item.productId} className="flex justify-between items-center text-muted-foreground">
                            <span>{item.quantity}x {item.name}</span>
                            <span>${(item.quantity * item.price).toLocaleString('es-CL')}</span>
                        </li>
                    ))}
                </ul>
                <Separator className="my-3"/>
                <div className="flex justify-between font-bold text-foreground">
                    <span>Total:</span>
                    <span>${order.total.toLocaleString('es-CL')}</span>
                </div>
            </CardContent>
            <CardFooter>
                {isReadyForDispatch && (
                    <Button className="w-full" onClick={() => onStatusChange(order.id, OrderStatus.InTransit)}>
                        <Truck className="mr-2 h-4 w-4"/> Marcar como En Ruta
                    </Button>
                )}
                {isInTransit && (
                    <Button className="w-full" variant="secondary" onClick={() => onStatusChange(order.id, OrderStatus.Delivered)}>
                        <Check className="mr-2 h-4 w-4"/> Confirmar Entrega
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

export default function DeliveryManagementPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [allOrders, allPatients] = await Promise.all([getAllOrders(), getPatients()]);
            setOrders(allOrders);
            setPatients(allPatients);
        } catch (error) {
            console.error('Failed to fetch delivery data:', error);
            toast({ title: "Error de Carga", description: "No se pudieron cargar los datos de entregas.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const homeCareOrders = useMemo<OrderWithPatient[]>(() => {
        const homeCarePatientIds = new Set(patients.filter(p => p.isHomeCare).map(p => p.id));
        return orders
            .filter(order => homeCarePatientIds.has(order.patientId))
            .map(order => ({
                ...order,
                patient: patients.find(p => p.id === order.patientId),
            }));
    }, [orders, patients]);

    const readyForDispatchOrders = homeCareOrders.filter(o => o.status === OrderStatus.Shipped);
    const inTransitOrders = homeCareOrders.filter(o => o.status === OrderStatus.InTransit);

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        setIsSubmitting(true);
        try {
            await updateOrder(orderId, { status: newStatus });
            toast({ title: "Estado Actualizado", description: `El pedido #${orderId} se ha actualizado a "${newStatus}".` });
            fetchData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar el estado del pedido.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Cargando gestión de entregas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Gestión de Entregas a Domicilio</h1>
                <p className="text-sm text-muted-foreground">
                    Coordine y rastree los pedidos para pacientes con atención domiciliaria.
                </p>
            </div>
            
            <Tabs defaultValue="ready">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ready">Listos para Despacho ({readyForDispatchOrders.length})</TabsTrigger>
                    <TabsTrigger value="in-transit">En Ruta ({inTransitOrders.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="ready" className="mt-4">
                    {readyForDispatchOrders.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {readyForDispatchOrders.map(order => (
                                <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                            ))}
                        </div>
                    ) : (
                        <Card className="text-center py-16 shadow-none border-dashed">
                           <CardHeader>
                               <PackageSearch className="h-12 w-12 text-muted-foreground mx-auto mb-2"/>
                               <CardTitle>No hay pedidos listos</CardTitle>
                           </CardHeader>
                           <CardContent>
                               <p className="text-muted-foreground">No hay pedidos de pacientes "Home Care" listos para ser despachados.</p>
                           </CardContent>
                       </Card>
                    )}
                </TabsContent>
                <TabsContent value="in-transit" className="mt-4">
                     {inTransitOrders.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {inTransitOrders.map(order => (
                                <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                            ))}
                        </div>
                    ) : (
                       <Card className="text-center py-16 shadow-none border-dashed">
                           <CardHeader>
                               <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-2"/>
                               <CardTitle>No hay pedidos en ruta</CardTitle>
                           </CardHeader>
                           <CardContent>
                               <p className="text-muted-foreground">Actualmente no hay pedidos en camino a los pacientes.</p>
                           </CardContent>
                       </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

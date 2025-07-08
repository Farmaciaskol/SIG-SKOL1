
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getOrders } from '@/lib/data';
import type { Order, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, PackageSearch, History } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';

const statusConfig: Record<OrderStatus, { text: string; badge: string; }> = {
  ['Pendiente']: { text: 'Pendiente', badge: 'bg-yellow-100 text-yellow-800' },
  ['Procesando']: { text: 'Procesando', badge: 'bg-blue-100 text-blue-800' },
  ['Despachado']: { text: 'Listo para Envío', badge: 'bg-indigo-100 text-indigo-800' },
  ['En Ruta']: { text: 'En Ruta', badge: 'bg-cyan-100 text-cyan-800' },
  ['Entregado']: { text: 'Entregado', badge: 'bg-green-100 text-green-800' },
  ['Cancelado']: { text: 'Cancelado', badge: 'bg-slate-200 text-slate-800' },
};

export default function OrdersHistoryPage() {
    const { patient, loading: patientLoading } = usePatientAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const fetchData = useCallback(async () => {
        if (!patient) return;
        setLoadingData(true);
        try {
            const allOrders = await getOrders(patient.id);
            const sortedOrders = allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setOrders(sortedOrders);
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setLoadingData(false);
        }
    }, [patient]);

    useEffect(() => {
        if (!patientLoading && patient) {
            fetchData();
        } else if (!patientLoading && !patient) {
            setLoadingData(false);
        }
    }, [patient, patientLoading, fetchData]);

    if (loadingData || patientLoading) {
        return <div className="flex items-center justify-center pt-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-bold font-headline">Mis Pedidos</h1>
                <Button asChild><Link href="/patient-portal/dashboard/new-order">Hacer un Nuevo Pedido</Link></Button>
            </div>

            {orders.length > 0 ? (
                <div className="space-y-4">
                    {orders.map(order => {
                        const config = statusConfig[order.status] || statusConfig.Pending;
                        return (
                        <Card key={order.id}>
                            <CardHeader>
                                 <div className="flex justify-between items-start flex-wrap gap-2">
                                    <CardTitle className="text-lg">Pedido #{order.id}</CardTitle>
                                    <Badge className={config.badge}>{config.text}</Badge>
                                </div>
                                <CardDescription>Fecha: {format(parseISO(order.createdAt), 'dd MMMM, yyyy', {locale: es})}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm">
                                    {order.items.map(item => (
                                        <li key={item.productId} className="flex justify-between">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>${(item.quantity * item.price).toLocaleString('es-CL')}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Separator className="my-3"/>
                                <div className="flex justify-between font-bold">
                                    <span>Total:</span>
                                    <span>${order.total.toLocaleString('es-CL')}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )})}
                </div>
            ) : (
                <Card className="text-center py-16 shadow-none border-dashed">
                    <CardHeader>
                        <PackageSearch className="h-12 w-12 text-muted-foreground mx-auto mb-2"/>
                        <CardTitle>Sin Pedidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Aún no has realizado ningún pedido.</p>
                        <Button className="mt-4" asChild><Link href="/patient-portal/dashboard/new-order">Hacer mi primer pedido</Link></Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CineService } from './cine';
import { Estado } from './estado';
import { Compra, Recibo } from '../models/types';

export type TabAdmin = 'peliculas' | 'funciones' | 'compras' | 'sql';
const TABS: TabAdmin[] = ['peliculas', 'funciones', 'compras', 'sql'];

@Injectable({ providedIn: 'root' })
export class AdminEstado {
    private cine = inject(CineService);
    private estado = inject(Estado);

    /** null = panel cerrado. */
    tab = signal<TabAdmin | null>(null);

    /** Recibo que se muestra en la ventana de la taquilla (compartido). */
    recibo = signal<Recibo | null>(null);

    abrir(tab?: string): void {
        this.tab.set(TABS.includes(tab as TabAdmin) ? (tab as TabAdmin) : 'peliculas');
    }

    cerrar(): void {
        this.tab.set(null);
    }

    /** Vuelve a pedir películas y funciones a la API (sin mostrar "cargando"). */
    async recargar(): Promise<void> {
        try {
            const [p, f] = await Promise.all([
                firstValueFrom(this.cine.getPeliculas()),
                firstValueFrom(this.cine.getFunciones())
            ]);
            this.estado.peliculas.set(p);
            this.estado.funciones.set(f);
        } catch { /* se dejan los datos anteriores */ }
    }

    /** Arma el recibo de una compra ya guardada. Devuelve null si falta la función o la película. */
    reciboDe(c: Compra): Recibo | null {
        const funcion = this.estado.funciones().find(f => Number(f.id) === Number(c.id_funcion));
        const pelicula = funcion
            ? this.estado.peliculas().find(p => Number(p.id) === Number(funcion.id_pelicula))
            : undefined;
        if (!funcion || !pelicula) return null;

        const alimentos = c.alimentos ?? [];
        const seats = c.asientos_seleccionados ?? [];
        const subEnt = Number(c.subtotal_entradas) || Number(c.cantidad_boletos) * Number(funcion.precio);
        const subAli = Number(c.subtotal_alimentos) || alimentos.reduce((a, x) => a + Number(x.subtotal || 0), 0);
        const pagoTxt = (c.metodo_pago || 'No especificado') +
            (c.estado_pago && c.estado_pago !== 'Pagado' ? ' — ' + c.estado_pago : '');

        return { compra: c, funcion, pelicula, seats, alimentos, subEnt, subAli, pagoTxt };
    }
}
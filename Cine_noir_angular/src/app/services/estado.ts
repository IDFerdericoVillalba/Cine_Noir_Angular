import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CineService } from './cine';
import { Funcion, Pelicula } from '../models/types';
import { LineaCarrito, PELICULAS_EXTRA, PRODUCTOS_CINE, generatePosterSvg } from '../data/catalogo';

@Injectable({ providedIn: 'root' })
export class Estado {
    private cine = inject(CineService);

    // ---------- Datos de la API ----------
    peliculas = signal<Pelicula[]>([]);
    funciones = signal<Funcion[]>([]);
    cargando = signal(true);
    errorCarga = signal('');

    // ---------- Selección en la taquilla ----------
    readonly maxAsientos = 8;
    peliculaId = signal<number | null>(null);
    funcionId = signal<number | null>(null);
    asientos = signal<string[]>([]);

    // ---------- Carrito de la confitería ----------
    carrito = signal<Record<number, number>>({});

    pelicula = computed(() => this.peliculas().find(p => Number(p.id) === this.peliculaId()) ?? null);
    funcion = computed(() => this.funciones().find(f => Number(f.id) === this.funcionId()) ?? null);

    lineasCarrito = computed<LineaCarrito[]>(() =>
        Object.entries(this.carrito())
            .map(([id, qty]) => {
                const producto = PRODUCTOS_CINE.find(p => p.id === Number(id));
                return producto && qty > 0 ? { producto, qty, subtotal: qty * producto.precio } : null;
            })
            .filter((l): l is LineaCarrito => l !== null)
    );

    totales = computed(() => {
        const f = this.funcion();
        const entradas = f ? this.asientos().length * Number(f.precio) : 0;
        const alimentos = this.lineasCarrito().reduce((a, l) => a + l.subtotal, 0);
        return { entradas, alimentos, total: entradas + alimentos };
    });

    // ---------- Carga ----------
    async cargar(): Promise<void> {
        this.cargando.set(true);
        this.errorCarga.set('');
        try {
            const [p, f] = await Promise.all([
                firstValueFrom(this.cine.getPeliculas()),
                firstValueFrom(this.cine.getFunciones())
            ]);
            this.peliculas.set(p);
            this.funciones.set(f);
        } catch {
            this.errorCarga.set('No se pudo conectar con la API. Revisa que Spring Boot esté corriendo y que tenga CORS habilitado.');
        } finally {
            this.cargando.set(false);
        }
    }

    /** Refresca solo las funciones (cupos) después de una compra. */
    async recargarFunciones(): Promise<void> {
        try {
            this.funciones.set(await firstValueFrom(this.cine.getFunciones()));
        } catch { /* se deja la lista anterior */ }
    }

    // ---------- Navegación hacia la taquilla ----------
    comprarPelicula(idPelicula: number, idFuncion?: number): void {
        this.peliculaId.set(Number(idPelicula));
        this.funcionId.set(idFuncion != null ? Number(idFuncion) : null);
        this.asientos.set([]);
        setTimeout(() => document.getElementById('taquilla')?.scrollIntoView({ behavior: 'smooth' }));
    }

    comprarFuncion(idFuncion: number): void {
        const f = this.funciones().find(x => Number(x.id) === Number(idFuncion));
        if (f) this.comprarPelicula(f.id_pelicula, f.id);
    }

    // ---------- Carrito ----------
    setCantidad(id: number, qty: number): void {
        const q = Math.max(0, Math.min(20, qty));
        this.carrito.update(c => {
            const n = { ...c };
            if (q === 0) delete n[id]; else n[id] = q;
            return n;
        });
    }
    agregar(id: number): void { this.setCantidad(id, (this.carrito()[id] ?? 0) + 1); }
    quitar(id: number): void { this.setCantidad(id, (this.carrito()[id] ?? 0) - 1); }
    eliminar(id: number): void { this.setCantidad(id, 0); }
    vaciarCarrito(): void { this.carrito.set({}); }

    // ---------- Utilidades ----------
    funcionesDe(idPelicula: number): Funcion[] {
        return this.funciones().filter(f => Number(f.id_pelicula) === Number(idPelicula));
    }

    formatCurrency(n: number | string): string {
        return '$' + (Number(n) || 0).toLocaleString('es-CO') + ' COP';
    }

    salaFormat(sala: string): string {
        const n = String(sala || '');
        if (n.includes('IMAX')) return 'IMAX';
        if (n.includes('3D')) return '3D';
        if (n.includes('MacroXE')) return 'MacroXE';
        if (n.includes('VIP')) return 'VIP';
        return '2D Láser';
    }

    formatFecha(iso: string): string {
        const [y, m, d] = String(iso).split('-').map(Number);
        if (!y || !m || !d) return String(iso);
        const fecha = new Date(y, m - 1, d);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const diff = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
        if (diff === 0) return 'Hoy';
        if (diff === 1) return 'Mañana';
        return fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    posterDe(p: Pelicula): string {
        return p.poster || PELICULAS_EXTRA[Number(p.id)]?.poster || generatePosterSvg(p.titulo, p.genero);
    }

    sinopsisDe(p: Pelicula): string {
        return p.sinopsis || PELICULAS_EXTRA[Number(p.id)]?.sinopsis ||
            'Producción cinematográfica de alto calibre proyectada con sonido envolvente multicanal.';
    }

    /** Si una portada no carga, se pone el póster de respaldo (una sola vez, sin bucles). */
    posterFallback(e: Event, p: Pelicula): void {
        const img = e.target as HTMLImageElement;
        if (img.dataset['fb']) return;
        img.dataset['fb'] = '1';
        img.src = generatePosterSvg(p.titulo, p.genero);
    }
}
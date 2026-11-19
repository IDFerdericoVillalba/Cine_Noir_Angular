import { Component, HostListener, effect, inject, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CineService } from '../services/cine';
import { Estado } from '../services/estado';
import { AdminEstado, TabAdmin } from '../services/admin';
import { Toast } from '../services/toast';
import { CompraDetallada, Funcion, Pelicula } from '../models/types';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
  standalone: true,
  imports: []
})
export class Admin {
  protected estado = inject(Estado);
  protected panel = inject(AdminEstado);
  private cine = inject(CineService);
  private toast = inject(Toast);

  tabs: { id: TabAdmin; texto: string }[] = [
    { id: 'peliculas', texto: 'Películas (peliculas)' },
    { id: 'funciones', texto: 'Funciones (funciones)' },
    { id: 'compras', texto: 'Compras (compras)' },
    { id: 'sql', texto: 'Script SQL' }
  ];

  clasificaciones = ['A (Todo Público)', 'B (+12)', 'B15 (+15)', 'C (Adultos +18)'];
  compras = signal<CompraDetallada[]>([]);
  sql = signal('-- Cargando script SQL...');
  private sqlCargado = false;

  // ---------- Formulario de película ----------
  formPelicula = signal(false);
  pId = signal<number | null>(null);
  pTitulo = signal('');
  pGenero = signal('');
  pDuracion = signal('');
  pClasif = signal('A (Todo Público)');

  // ---------- Formulario de función ----------
  formFuncion = signal(false);
  fId = signal<number | null>(null);
  fPelicula = signal<number | null>(null);
  fFecha = signal('');
  fHora = signal('');
  fSala = signal('');
  fPrecio = signal('');
  fCupos = signal('');

  constructor() {
    effect(() => {
      const t = this.panel.tab();
      untracked(() => {
        if (t === 'compras') void this.cargarCompras();
        if (t === 'sql') void this.cargarSql();
      });
    });
  }

  @HostListener('document:keydown.escape')
  cerrar(): void {
    this.formPelicula.set(false);
    this.formFuncion.set(false);
    this.panel.cerrar();
  }

  val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  private msg(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const cuerpo = err.error;
      if (typeof cuerpo === 'string' && cuerpo) return cuerpo;
      if (cuerpo && typeof cuerpo.mensaje === 'string') return cuerpo.mensaje;
      if (cuerpo && typeof cuerpo.message === 'string') return cuerpo.message;
      return `${err.status} ${err.statusText || 'Error de red'}`;
    }
    return err instanceof Error ? err.message : String(err);
  }

  tituloDe(idPelicula: number): string {
    return this.estado.peliculas().find(p => Number(p.id) === Number(idPelicula))?.titulo ?? String(idPelicula);
  }

  // ==================== PELÍCULAS ====================
  nuevaPelicula(): void {
    this.pId.set(null);
    this.pTitulo.set('');
    this.pGenero.set('');
    this.pDuracion.set('');
    this.pClasif.set(this.clasificaciones[0]);
    this.formPelicula.set(true);
  }

  editarPelicula(p: Pelicula): void {
    this.pId.set(Number(p.id));
    this.pTitulo.set(p.titulo);
    this.pGenero.set(p.genero);
    this.pDuracion.set(String(p.duracion));
    this.pClasif.set(p.clasificacion);
    this.formPelicula.set(true);
  }

  async guardarPelicula(e: Event): Promise<void> {
    e.preventDefault();
    const data = {
      titulo: this.pTitulo().trim(),
      genero: this.pGenero().trim(),
      duracion: this.pDuracion().trim(),
      clasificacion: this.pClasif()
    };
    if (!data.titulo || !data.genero || !data.duracion) {
      this.toast.mostrar('Completa título, género y duración.', 'error');
      return;
    }
    try {
      const id = this.pId();
      if (id !== null) {
        await firstValueFrom(this.cine.updatePelicula(id, data));
        this.toast.mostrar('Película actualizada.', 'success');
      } else {
        await firstValueFrom(this.cine.createPelicula(data));
        this.toast.mostrar('Película creada.', 'success');
      }
      this.formPelicula.set(false);
      await this.panel.recargar();
    } catch (err) {
      this.toast.mostrar('Error: ' + this.msg(err), 'error');
    }
  }

  async eliminarPelicula(p: Pelicula): Promise<void> {
    if (!confirm(`¿Eliminar la película #${p.id}?`)) return;
    try {
      await firstValueFrom(this.cine.deletePelicula(Number(p.id)));
      this.toast.mostrar('Película eliminada.', 'info');
      await this.panel.recargar();
    } catch (err) {
      this.toast.mostrar(this.msg(err), 'error');
    }
  }

  // ==================== FUNCIONES ====================
  private hoy(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  nuevaFuncion(): void {
    const pelis = this.estado.peliculas();
    if (pelis.length === 0) {
      this.toast.mostrar('Primero crea una película.', 'error');
      return;
    }
    this.fId.set(null);
    this.fPelicula.set(Number(pelis[0].id));
    this.fFecha.set(this.hoy());
    this.fHora.set('');
    this.fSala.set('Sala 1 - IMAX Laser');
    this.fPrecio.set('18000');
    this.fCupos.set('50');
    this.formFuncion.set(true);
  }

  editarFuncion(f: Funcion): void {
    this.fId.set(Number(f.id));
    this.fPelicula.set(Number(f.id_pelicula));
    this.fFecha.set(f.fecha);
    this.fHora.set(String(f.hora).slice(0, 5));
    this.fSala.set(f.sala);
    this.fPrecio.set(String(f.precio));
    this.fCupos.set(String(f.cupos_disponibles));
    this.formFuncion.set(true);
  }

  async guardarFuncion(e: Event): Promise<void> {
    e.preventDefault();
    const idPelicula = this.fPelicula();
    const precio = Number(this.fPrecio());
    const cupos = Number(this.fCupos());
    if (idPelicula === null || !this.fFecha() || !this.fHora() || !this.fSala().trim()) {
      this.toast.mostrar('Completa película, fecha, hora y sala.', 'error');
      return;
    }
    if (!(precio >= 1000) || !(cupos >= 1 && cupos <= 500)) {
      this.toast.mostrar('El precio debe ser de al menos $1.000 y los cupos entre 1 y 500.', 'error');
      return;
    }
    const data = {
      id_pelicula: idPelicula,
      fecha: this.fFecha(),
      hora: this.fHora(),
      sala: this.fSala().trim(),
      precio,
      cupos_disponibles: cupos
    };
    try {
      const id = this.fId();
      if (id !== null) {
        await firstValueFrom(this.cine.updateFuncion(id, data));
        this.toast.mostrar('Función actualizada.', 'success');
      } else {
        await firstValueFrom(this.cine.createFuncion(data));
        this.toast.mostrar('Función programada.', 'success');
      }
      this.formFuncion.set(false);
      await this.panel.recargar();
    } catch (err) {
      this.toast.mostrar('Error: ' + this.msg(err), 'error');
    }
  }

  async eliminarFuncion(f: Funcion): Promise<void> {
    if (!confirm(`¿Eliminar la función #${f.id}?`)) return;
    try {
      await firstValueFrom(this.cine.deleteFuncion(Number(f.id)));
      this.toast.mostrar('Función eliminada.', 'info');
      await this.panel.recargar();
    } catch (err) {
      this.toast.mostrar(this.msg(err), 'error');
    }
  }

  // ==================== COMPRAS ====================
  async cargarCompras(): Promise<void> {
    try {
      this.compras.set(await firstValueFrom(this.cine.getComprasDetalladas()));
    } catch (err) {
      this.toast.mostrar('No se pudieron cargar las compras: ' + this.msg(err), 'error');
    }
  }

  verTicket(c: CompraDetallada): void {
    const r = this.panel.reciboDe(c);
    if (!r) {
      this.toast.mostrar('No se encontró la función o la película de esta compra.', 'error');
      return;
    }
    this.panel.recibo.set(r);
  }

  // ==================== SQL ====================
  async cargarSql(): Promise<void> {
    if (this.sqlCargado) return;
    try {
      const res = await fetch('database.sql');
      if (res.ok) {
        this.sql.set(await res.text());
        this.sqlCargado = true;
        return;
      }
    } catch { /* se usa el mensaje de abajo */ }
    this.sql.set('-- No se encontró database.sql.\n-- Copia ese archivo dentro de la carpeta "public" del proyecto.');
  }

  copiarSql(): void {
    navigator.clipboard.writeText(this.sql()).then(() => {
      this.toast.mostrar('¡Script SQL copiado al portapapeles!', 'success');
    });
  }
}

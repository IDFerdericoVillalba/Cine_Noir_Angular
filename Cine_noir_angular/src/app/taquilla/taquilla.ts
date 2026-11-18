import { Component, HostListener, WritableSignal, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { CineService } from '../services/cine';
import { Estado } from '../services/estado';
import { Toast } from '../services/toast';
import { AdminEstado } from '../services/admin';
import { CINE_CONTACTO } from '../data/catalogo';
import { AlimentoCompra, Compra, Funcion, Recibo } from '../models/types';

type Metodo = 'tarjeta' | 'pse' | 'nequi' | 'daviplata' | 'efectivo';

interface FilaSala {
  fila: string;
  sillas: { id: string; n: number; ocupada: boolean }[];
}

@Component({
  selector: 'app-taquilla',
  templateUrl: './taquilla.html',
  styleUrls: ['./taquilla.css'],
  standalone: true,
  imports: [CommonModule]
})
export class Taquilla {
  protected estado = inject(Estado);
  private cine = inject(CineService);
  private toast = inject(Toast);

  readonly filas = ['A', 'B', 'C', 'D', 'E', 'F'];
  readonly porFila = 10;
  readonly metodos: { id: Metodo; nombre: string; sub: string; ico: string; clase: string }[] = [
    { id: 'tarjeta', nombre: 'Tarjeta', sub: 'Crédito / Débito', ico: '💳', clase: '' }, { id: 'pse', nombre: 'PSE', sub: 'Débito bancario', ico: 'PSE', clase: 'pay-ico-text pse' },
    { id: 'nequi', nombre: 'Nequi', sub: 'Desde tu celular', ico: 'N', clase: 'pay-ico-text nequi' },
    { id: 'daviplata', nombre: 'Daviplata', sub: 'Desde tu celular', ico: 'D', clase: 'pay-ico-text davi' },
    { id: 'efectivo', nombre: 'Efectivo', sub: 'Pagas en taquilla', ico: '💵', clase: '' }];
  readonly bancos = [
    'Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA Colombia', 'Banco de Occidente',
    'Banco Popular', 'Scotiabank Colpatria', 'Banco Caja Social', 'Banco AV Villas', 'Nu Colombia'
  ];

  // ---------- Formulario ----------
  metodo = signal<Metodo>('tarjeta');
  nombre = signal('');
  email = signal('');
  cardNumber = signal('');
  cardName = signal('');
  cardExpiry = signal('');
  cardCvv = signal('');
  pseBank = signal('');
  pseDoc = signal('');
  nequiPhone = signal('');
  daviPhone = signal('');
  terminos = signal(false);
  procesando = signal(false);
  recibo = inject(AdminEstado).recibo;

  // ---------- Derivados ----------
  funcsPelicula = computed(() => {
    const id = this.estado.peliculaId();
    return id ? this.estado.funcionesDe(id) : [];
  });

  hechos = computed(() => {
    if (!this.estado.funcion()) return 0;
    return this.estado.asientos().length > 0 ? 2 : 1;
  });

  sala = computed<FilaSala[]>(() => {
    const f = this.estado.funcion();
    if (!f) return [];
    const total = this.filas.length * this.porFila;
    const libres = Math.min(Number(f.cupos_disponibles), total);
    const cuantas = Math.max(0, total - libres);
    const ocupadas = new Set<string>();
    const idDe = (idx: number) => `${this.filas[Math.floor(idx / this.porFila)]}${(idx % this.porFila) + 1}`;
    let seed = Number(f.id) * 19;
    let guard = 0;
    while (ocupadas.size < cuantas && guard++ < 5000) {
      seed = (seed * 9301 + 49297) % 233280;
      ocupadas.add(idDe(Math.floor((seed / 233280) * total)));
    }
    for (let i = 0; ocupadas.size < cuantas && i < total; i++) ocupadas.add(idDe(i));

    return this.filas.map(fila => ({
      fila,
      sillas: Array.from({ length: this.porFila }, (_, i) => {
        const id = `${fila}${i + 1}`;
        return { id, n: i + 1, ocupada: ocupadas.has(id) };
      })
    }));
  });

  // ---------- Paso 1: película y función ----------
  onPelicula(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.estado.peliculaId.set(v ? Number(v) : null);
    this.estado.funcionId.set(null);
    this.estado.asientos.set([]);
  }

  elegirFuncion(f: Funcion): void {
    this.estado.funcionId.set(Number(f.id));
    this.estado.asientos.set([]);
  }

  // ---------- Paso 2: butacas ----------
  elegida(id: string): boolean {
    return this.estado.asientos().includes(id);
  }

  toggleSeat(id: string): void {
    const f = this.estado.funcion();
    if (!f) return;
    const actuales = this.estado.asientos();
    if (actuales.includes(id)) {
      this.estado.asientos.set(actuales.filter(s => s !== id));
      return;
    }
    const limite = Math.min(this.estado.maxAsientos, Number(f.cupos_disponibles));
    if (actuales.length >= limite) {
      this.toast.mostrar(`Puedes reservar máximo ${limite} butaca(s) por compra.`, 'error');
      return;
    }
    const nuevas = [...actuales, id].sort((a, b) =>
      a[0].localeCompare(b[0]) || parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
    this.estado.asientos.set(nuevas);
  }

  vaciarButacas(): void { this.estado.asientos.set([]); }

  ir(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  // ---------- Paso 3: pago ----------
  elegirMetodo(m: Metodo): void { this.metodo.set(m); }
  val(e: Event): string { return (e.target as HTMLInputElement).value; }
  check(e: Event): boolean { return (e.target as HTMLInputElement).checked; }

  soloDigitos(e: Event, max: number, destino: WritableSignal<string>): void {
    const el = e.target as HTMLInputElement;
    el.value = el.value.replace(/\D/g, '').slice(0, max);
    destino.set(el.value);
  }

  onCardNumber(e: Event): void {
    const el = e.target as HTMLInputElement;
    const d = el.value.replace(/\D/g, '').slice(0, 16);
    el.value = d.replace(/(.{4})/g, '$1 ').trim();
    this.cardNumber.set(el.value);
  }

  onCardExpiry(e: Event): void {
    const el = e.target as HTMLInputElement;
    let d = el.value.replace(/\D/g, '').slice(0, 4);
    if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2);
    el.value = d;
    this.cardExpiry.set(d);
  }

  marca(digitos: string): string {
    if (/^4/.test(digitos)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(digitos)) return 'Mastercard';
    if (/^3[47]/.test(digitos)) return 'Amex';
    return 'Tarjeta';
  }

  marcaActual(): string {
    const d = this.cardNumber().replace(/\D/g, '');
    return d.length ? this.marca(d) : '';
  }

  private luhn(num: string): boolean {
    let suma = 0;
    let alt = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let n = parseInt(num[i], 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      suma += n;
      alt = !alt;
    }
    return suma % 10 === 0;
  }

  payLabel(): string {
    switch (this.metodo()) {
      case 'tarjeta': {
        const n = this.cardNumber().replace(/\D/g, '');
        return n.length >= 4 ? `${this.marca(n)} •••• ${n.slice(-4)}` : 'Tarjeta crédito / débito';
      }
      case 'pse': return this.pseBank() ? `PSE · ${this.pseBank()}` : 'PSE';
      case 'nequi': return 'Nequi';
      case 'daviplata': return 'Daviplata';
      case 'efectivo': return 'Efectivo en taquilla';
    }
  }

  etiquetaPagar(): string {
    const total = this.estado.totales().total;
    const efectivo = this.metodo() === 'efectivo';
    const ico = efectivo ? '🎟️' : '🔒'; if (total > 0) return `${ico} ${efectivo ? 'Reservar' : 'Pagar'} ${this.estado.formatCurrency(total)}`;
    return `${ico} ${efectivo ? 'Reservar y pagar en taquilla' : 'Confirmar y pagar'}`;
  }

  private validarPago(): string | null {
    switch (this.metodo()) {
      case 'tarjeta': {
        const num = this.cardNumber().replace(/\D/g, '');
        if (num.length < 13 || !this.luhn(num)) return 'El número de tarjeta no es válido.';
        if (!this.cardName().trim()) return 'Escribe el nombre que aparece en la tarjeta.';
        const m = this.cardExpiry().match(/^(\d{2})\/(\d{2})$/);
        if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return 'La fecha de vencimiento no es válida (MM/AA).';
        const vence = new Date(2000 + Number(m[2]), Number(m[1]), 0, 23, 59);
        if (vence < new Date()) return 'La tarjeta está vencida.';
        if (!/^\d{3,4}$/.test(this.cardCvv())) return 'El código de seguridad (CVV) no es válido.';
        return null;
      }
      case 'pse':
        if (!this.pseBank()) return 'Selecciona tu banco para pagar con PSE.';
        if (!/^\d{5,12}$/.test(this.pseDoc())) return 'Ingresa un número de documento válido.';
        return null;
      case 'nequi':
        return /^3\d{9}$/.test(this.nequiPhone()) ? null : 'Ingresa un celular colombiano válido (10 dígitos, empieza por 3).';
      case 'daviplata':
        return /^3\d{9}$/.test(this.daviPhone()) ? null : 'Ingresa un celular colombiano válido (10 dígitos, empieza por 3).';
      default:
        return null;
    }
  }

  private reiniciarFormulario(): void {
    this.nombre.set('');
    this.email.set('');
    this.cardNumber.set('');
    this.cardName.set('');
    this.cardExpiry.set('');
    this.cardCvv.set('');
    this.pseBank.set('');
    this.pseDoc.set('');
    this.nequiPhone.set('');
    this.daviPhone.set('');
    this.terminos.set(false);
    this.metodo.set('tarjeta');
  }

  // ---------- Finalizar compra ----------
  async finalizar(e: Event): Promise<void> {
    e.preventDefault();
    const funcion = this.estado.funcion();
    const pelicula = this.estado.pelicula();
    if (!funcion || !pelicula) {
      this.toast.mostrar('Selecciona primero una función de la lista.', 'error');
      return;
    }
    const seats = [...this.estado.asientos()];
    const cliente = this.nombre().trim();
    if (!cliente) { this.toast.mostrar('Ingresa el nombre del cliente.', 'error'); return; }
    if (seats.length === 0) { this.toast.mostrar('Debes seleccionar al menos 1 butaca en la sala virtual.', 'error'); return; }

    const errorPago = this.validarPago();
    if (errorPago) { this.toast.mostrar(errorPago, 'error'); return; }
    if (!this.terminos()) { this.toast.mostrar('Debes aceptar los términos de compra para continuar.', 'error'); return; }

    const efectivo = this.metodo() === 'efectivo';
    const t = this.estado.totales();
    const alimentos: AlimentoCompra[] = this.estado.lineasCarrito().map(l => ({
      id_producto: l.producto.id,
      nombre: l.producto.nombre,
      categoria: l.producto.categoria,
      cantidad: l.qty,
      precio_unitario: l.producto.precio,
      subtotal: l.subtotal
    }));
    const pagoTxt = this.payLabel();
    const datos: Omit<Compra, 'id' | 'fecha_compra'> = {
      id_funcion: Number(funcion.id),
      nombre_cliente: cliente,
      email_cliente: this.email().trim(),
      cantidad_boletos: seats.length,
      total_pago: t.total,
      subtotal_entradas: t.entradas,
      subtotal_alimentos: t.alimentos,
      alimentos,
      asientos_seleccionados: seats,
      metodo_pago: pagoTxt,
      estado_pago: efectivo ? 'Pendiente (pago en taquilla)' : 'Pagado'
    };

    this.procesando.set(true);
    try {
      if (!efectivo) await new Promise(r => setTimeout(r, 1400));
      const resp = await firstValueFrom(this.cine.registrarCompra(datos));
      const compra: Compra = { ...resp, ...datos, id: resp.id, fecha_compra: resp.fecha_compra };
      this.toast.mostrar(
        efectivo
          ? `Reserva #${compra.id} creada. Paga en taquilla antes de la función.`
          : `¡Pago aprobado! Entrada #${compra.id} generada.`,
        'success');
      this.recibo.set({ compra, funcion, pelicula, seats, alimentos, subEnt: t.entradas, subAli: t.alimentos, pagoTxt });
      this.estado.asientos.set([]);
      this.estado.vaciarCarrito();
      this.reiniciarFormulario();
      await this.estado.recargarFunciones();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.mostrar('Error en la transacción: ' + msg, 'error');
    } finally {
      this.procesando.set(false);
    }
  }

  // ---------- Recibo ----------
  @HostListener('document:keydown.escape')
  cerrarRecibo(): void { this.recibo.set(null); }

  codigo(r: Recibo): string {
    return `TKT-${r.compra.id}-${String(r.compra.nombre_cliente).replace(/\s+/g, '').substring(0, 8).toUpperCase()}`;
  }

  numEntradas(r: Recibo): number {
    return Number(r.compra.cantidad_boletos) || r.seats.length || 1;
  }

  enviarCopiaAlCine(): void {
    const r = this.recibo();
    if (!r) return;
    const { compra, funcion, pelicula, seats, alimentos, subEnt, subAli, pagoTxt } = r;
    const f = (n: number) => this.estado.formatCurrency(n);
    const lineas = [
      `NUEVA COMPRA #${compra.id}`,
      `Película: ${pelicula.titulo}`,
      `Función: ${funcion.fecha} ${funcion.hora} · ${funcion.sala}`,
      `Cliente: ${compra.nombre_cliente}${compra.email_cliente ? ' (' + compra.email_cliente + ')' : ''}`,
      `Butacas (${compra.cantidad_boletos}): ${seats.join(', ') || '—'}`,
      `Entradas: ${f(subEnt)}`,
      ...(alimentos.length
        ? ['Alimentos:', ...alimentos.map(a => ` - ${a.cantidad}x ${a.nombre}: ${f(a.subtotal)}`), `Subtotal alimentos: ${f(subAli)}`]
        : []),
      `TOTAL: ${f(compra.total_pago)}`,
      `Pago: ${pagoTxt}`
    ];
    const asunto = encodeURIComponent(`Compra #${compra.id} - ${pelicula.titulo}`);
    window.location.href = `mailto:${CINE_CONTACTO.emailTaquilla}?subject=${asunto}&body=${encodeURIComponent(lineas.join('\n'))}`;
  }

  imprimir(): void {
    const r = this.recibo();
    if (!r) return;
    document.getElementById('printSheet')?.remove();
    const hoja = document.createElement('div');
    hoja.id = 'printSheet';
    hoja.className = 'printable-area';
    hoja.setAttribute('aria-hidden', 'true');
    hoja.innerHTML = this.htmlImpresion(r);
    document.body.appendChild(hoja);
    window.addEventListener('afterprint', () => hoja.remove(), { once: true });
    window.print();
  }

  private esc(v: unknown): string {
    return String(v ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  }

  private htmlImpresion(r: Recibo): string {
    const { compra, funcion, pelicula, alimentos, subEnt, subAli, pagoTxt } = r;
    const e = (v: unknown) => this.esc(v);
    const f = (n: number) => this.estado.formatCurrency(n);
    const n = this.numEntradas(r);
    const seats = r.seats.length ? r.seats : Array.from({ length: n }, () => '—');
    const marca = '<div class="pt-brand">CINEMA NOIR</div>';
    const entradas = seats.map((seat, i) => `
      <section class="pt-ticket">
        ${marca}
        <div class="pt-sub">ENTRADA ${i + 1} DE ${seats.length}</div>
        <div class="pt-movie">${e(pelicula.titulo)}</div>
        <div class="pt-meta">${e(pelicula.clasificacion)} · ${e(pelicula.duracion)}</div>
        <div class="pt-grid">
          <div><small>FECHA</small><b>${e(funcion.fecha)}</b></div>
          <div><small>HORA</small><b>${e(funcion.hora)}</b></div>
          <div class="pt-wide"><small>SALA</small><b>${e(funcion.sala)}</b></div>
        </div>
        <div class="pt-seat"><small>BUTACA</small><b>${e(seat)}</b></div>
        <div class="pt-grid">
          <div><small>PRECIO</small><b>${f(funcion.precio)}</b></div>
          <div><small>COMPRA</small><b>#${e(compra.id)}</b></div>
        </div>
        <div class="pt-bars"></div>
        <div class="pt-code">TKT-${e(compra.id)}-${e(seat)}</div>
        <div class="pt-foot">Presenta esta entrada al ingresar a la sala.</div>
      </section>`).join('');

    const filasAli = alimentos.map(a =>
      `<div class="pt-row"><span>${a.cantidad}× ${e(a.nombre)}</span><span>${f(a.subtotal)}</span></div>`).join('');

    const copia = `
      <section class="pt-ticket pt-copy">
        ${marca}
        <div class="pt-sub">★ COPIA TAQUILLA ★</div>
        <div class="pt-movie">${e(pelicula.titulo)}</div>
        <div class="pt-meta">${e(funcion.fecha)} · ${e(funcion.hora)} · ${e(funcion.sala)}</div>
        <hr>
        <div class="pt-row"><span>Compra</span><b>#${e(compra.id)}</b></div>
        <div class="pt-row"><span>Cliente</span><b>${e(compra.nombre_cliente)}</b></div>
        ${compra.email_cliente ? `<div class="pt-row"><span>Correo</span><b>${e(compra.email_cliente)}</b></div>` : ''}
        <div class="pt-row"><span>Butacas (${n})</span><b>${e(seats.join(', '))}</b></div>
        <hr>
        <div class="pt-row"><span>Entradas</span><span>${f(subEnt)}</span></div>
        ${alimentos.length ? `<div class="pt-sub2">ALIMENTOS</div>${filasAli}<div class="pt-row"><span>Subtotal alimentos</span><span>${f(subAli)}</span></div>` : ''}
        <hr>
        <div class="pt-row pt-total"><span>TOTAL</span><b>${f(compra.total_pago)}</b></div>
        <div class="pt-row"><span>Pago</span><b>${e(pagoTxt)}</b></div>
        <div class="pt-bars"></div>
        <div class="pt-code">TKT-${e(compra.id)}</div>
        <div class="pt-foot">Copia interna de la taquilla.</div>
      </section>`;

    return entradas + copia;
  }
}

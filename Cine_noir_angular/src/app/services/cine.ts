import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import {
  Pelicula, Funcion, Compra,
  FuncionConPelicula, CompraDetallada, Metricas
} from '../models/types';

/** Formas JSON que realmente expone Spring Boot (records Java -> camelCase). */
interface ApiFuncion {
  id: number;
  idPelicula: number;
  fecha: string;
  hora: string;
  sala: string;
  precio: number;
  cuposDisponibles: number;
}
interface ApiCompra {
  id: number;
  idFuncion: number;
  nombreCliente: string;
  cantidadBoletos: number;
  totalPago: number;
  fechaCompra: string;
}

@Injectable({ providedIn: 'root' })
export class CineService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  // El resto de la interfaz usa snake_case; traducimos aquí en el borde HTTP.
  private funcionDesdeApi(f: ApiFuncion): Funcion {
    return {
      id: Number(f.id),
      id_pelicula: Number(f.idPelicula),
      fecha: f.fecha,
      hora: f.hora,
      sala: f.sala,
      precio: Number(f.precio),
      cupos_disponibles: Number(f.cuposDisponibles)
    };
  }

  private compraDesdeApi(c: ApiCompra): Compra {
    return {
      id: Number(c.id),
      id_funcion: Number(c.idFuncion),
      nombre_cliente: c.nombreCliente,
      cantidad_boletos: Number(c.cantidadBoletos),
      total_pago: Number(c.totalPago),
      fecha_compra: c.fechaCompra
    };
  }

  private funcionHaciaApi(f: Omit<Funcion, 'id'>): Omit<ApiFuncion, 'id'> {
    return {
      idPelicula: Number(f.id_pelicula),
      fecha: f.fecha,
      hora: f.hora,
      sala: f.sala,
      precio: Number(f.precio),
      cuposDisponibles: Number(f.cupos_disponibles)
    };
  }

  // ---------- PELÍCULAS ----------
  getPeliculas(): Observable<Pelicula[]> {
    return this.http.get<Pelicula[]>(`${this.baseUrl}/peliculas`);
  }
  getPelicula(id: number): Observable<Pelicula> {
    return this.http.get<Pelicula>(`${this.baseUrl}/peliculas/${id}`);
  }
  createPelicula(data: Omit<Pelicula, 'id'>): Observable<Pelicula> {
    return this.http.post<Pelicula>(`${this.baseUrl}/peliculas`, data);
  }
  updatePelicula(id: number, data: Omit<Pelicula, 'id'>): Observable<Pelicula> {
    return this.http.put<Pelicula>(`${this.baseUrl}/peliculas/${id}`, data);
  }
  deletePelicula(id: number): Observable<string> {
    // Spring responde texto plano en este endpoint.
    return this.http.delete(`${this.baseUrl}/peliculas/${id}`, { responseType: 'text' });
  }

  // ---------- FUNCIONES ----------
  getFunciones(): Observable<Funcion[]> {
    return this.http.get<ApiFuncion[]>(`${this.baseUrl}/funciones`).pipe(
      map(items => items.map(f => this.funcionDesdeApi(f)))
    );
  }
  getFuncion(id: number): Observable<Funcion> {
    return this.http.get<ApiFuncion>(`${this.baseUrl}/funciones/${id}`).pipe(
      map(f => this.funcionDesdeApi(f))
    );
  }
  createFuncion(data: Omit<Funcion, 'id'>): Observable<Funcion> {
    return this.http.post<ApiFuncion>(`${this.baseUrl}/funciones`, this.funcionHaciaApi(data)).pipe(
      map(f => this.funcionDesdeApi(f))
    );
  }
  updateFuncion(id: number, data: Omit<Funcion, 'id'>): Observable<Funcion> {
    return this.http.put<ApiFuncion>(`${this.baseUrl}/funciones/${id}`, this.funcionHaciaApi(data)).pipe(
      map(f => this.funcionDesdeApi(f))
    );
  }
  deleteFuncion(id: number): Observable<string> {
    // Spring responde texto plano en este endpoint.
    return this.http.delete(`${this.baseUrl}/funciones/${id}`, { responseType: 'text' });
  }

  // ---------- COMPRAS ----------
  getCompras(): Observable<Compra[]> {
    return this.http.get<ApiCompra[]>(`${this.baseUrl}/compras`).pipe(
      map(items => items.map(c => this.compraDesdeApi(c)))
    );
  }
  registrarCompra(data: Omit<Compra, 'id' | 'fecha_compra'>): Observable<Compra> {
    // El endpoint actual solo acepta estos tres campos. El servidor calcula el total.
    const request = {
      idFuncion: Number(data.id_funcion),
      nombreCliente: data.nombre_cliente,
      cantidadBoletos: Number(data.cantidad_boletos)
    };
    return this.http.post<ApiCompra>(`${this.baseUrl}/compras`, request).pipe(
      map(c => this.compraDesdeApi(c))
    );
  }
  // ---------- ENRIQUECIDOS (JOIN) ----------
  getFuncionesConPelicula(): Observable<FuncionConPelicula[]> {
    return forkJoin([this.getFunciones(), this.getPeliculas()]).pipe(
      map(([funciones, peliculas]) => {
        const mapa = new Map(peliculas.map(p => [Number(p.id), p]));
        return funciones.map(f => ({
          ...f,
          pelicula: mapa.get(Number(f.id_pelicula)) ?? {
            titulo: 'Película no encontrada',
            genero: 'Desconocido',
            duracion: '-',
            clasificacion: '-'
          }
        }));
      })
    );
  }

  getComprasDetalladas(): Observable<CompraDetallada[]> {
    return forkJoin([this.getCompras(), this.getFunciones(), this.getPeliculas()]).pipe(
      map(([compras, funciones, peliculas]) => {
        const pMap = new Map(peliculas.map(p => [Number(p.id), p]));
        const fMap = new Map(
          funciones.map(f => [Number(f.id), { ...f, pelicula: pMap.get(Number(f.id_pelicula)) }])
        );
        return compras.map(c => ({ ...c, funcion: fMap.get(Number(c.id_funcion)) ?? null }));
      })
    );
  }

  getMetricas(): Observable<Metricas> {
    return forkJoin([this.getPeliculas(), this.getFunciones(), this.getCompras()]).pipe(
      map(([peliculas, funciones, compras]) => {
        const totalIngresos = compras.reduce((s, c) => s + (Number(c.total_pago) || 0), 0);
        const totalBoletos = compras.reduce((s, c) => s + (Number(c.cantidad_boletos) || 0), 0);
        return {
          totalIngresos,
          totalBoletos,
          totalPeliculas: peliculas.length,
          totalFunciones: funciones.length,
          cuposRestantes: funciones.reduce((s, f) => s + (Number(f.cupos_disponibles) || 0), 0),
          promedioBoleto: totalBoletos > 0 ? totalIngresos / totalBoletos : 0
        };
      })
    );
  }
}

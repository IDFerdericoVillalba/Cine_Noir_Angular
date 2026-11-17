import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import {
  Pelicula, Funcion, Compra,
  FuncionConPelicula, CompraDetallada, Metricas
} from '../models/types';

@Injectable({ providedIn: 'root' })
export class CineService {
  private http = inject(HttpClient);
  // Spring Boot corre por defecto en 8080. Ajusta si tu prefijo es otro.
  private baseUrl = 'http://localhost:8080/api';

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
  deletePelicula(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/peliculas/${id}`);
  }

  // ---------- FUNCIONES ----------
  getFunciones(): Observable<Funcion[]> {
    return this.http.get<Funcion[]>(`${this.baseUrl}/funciones`);
  }
  getFuncion(id: number): Observable<Funcion> {
    return this.http.get<Funcion>(`${this.baseUrl}/funciones/${id}`);
  }
  createFuncion(data: Omit<Funcion, 'id'>): Observable<Funcion> {
    return this.http.post<Funcion>(`${this.baseUrl}/funciones`, data);
  }
  updateFuncion(id: number, data: Omit<Funcion, 'id'>): Observable<Funcion> {
    return this.http.put<Funcion>(`${this.baseUrl}/funciones/${id}`, data);
  }
  deleteFuncion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/funciones/${id}`);
  }

  // ---------- COMPRAS ----------
  getCompras(): Observable<Compra[]> {
    return this.http.get<Compra[]>(`${this.baseUrl}/compras`);
  }
  registrarCompra(data: Omit<Compra, 'id' | 'fecha_compra'>): Observable<Compra> {
    return this.http.post<Compra>(`${this.baseUrl}/compras`, data);
  }
  anularCompra(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/compras/${id}`);
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
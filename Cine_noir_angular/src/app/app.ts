import { Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header } from './header/header';
import { Carousel } from './carousel/carousel';
import { FilmStrip } from './film-strip/film-strip';
import { Cartelera } from './cartelera/cartelera';
import { Combos } from './combos/combos';
import { Wanted } from './wanted/wanted';
import { Admin } from './admin/admin';
import { Taquilla } from './taquilla/taquilla';
import { Contacto } from './contacto/contacto';
import { SiteFooter } from './site-footer/site-footer';
import { ToastContainer } from './toast-container/toast-container';
import { Estado } from './services/estado';
import { AdminEstado } from './services/admin';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    Header,
    Carousel,
    FilmStrip,
    Cartelera,
    Combos,
    Wanted,
    Admin,
    Taquilla,
    Contacto,
    SiteFooter,
    ToastContainer
  ],
  styleUrls: ['./app.css'],
  // app.css contiene estilos compartidos por los componentes hijos de la página.
  // Al dejarlos encapsulados, esas reglas no alcanzan el HTML interno de los hijos.
  encapsulation: ViewEncapsulation.None,
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly title = signal('Cine_noir_angular');
  protected readonly estado = inject(Estado);
  private readonly admin = inject(AdminEstado);

  ngOnInit(): void {
    this.estado.cargar();
  }

  /** Se dispara desde el carrusel con el id de la película elegida. */
  onComprar(idPelicula: number): void {
    this.estado.comprarPelicula(idPelicula);
  }

  onAdmin(): void {
    this.admin.abrir();
  }
}

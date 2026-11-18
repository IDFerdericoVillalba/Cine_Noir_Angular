import { Component, OnInit, inject, signal } from '@angular/core';
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
import { ToastContainer } from './toast-container/toast-container';   // <-- nuevo import
import { Estado } from './services/estado';
import { AdminEstado } from './services/admin';
import { Toast } from './services/toast';

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
    ToastContainer            // <-- añade al array de imports
  ],
  styleUrls: ['./app.css'],
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly title = signal('Cine_noir_angular');
  protected readonly estado = inject(Estado);
  protected readonly toast = inject(Toast);
  private readonly admin = inject(AdminEstado);

  ngOnInit(): void {
    this.estado.cargar();
  }

  onComprar(): void {
    // Puedes obtener datos del evento en el futuro.
    // Por ahora solo usamos el método del servicio Toast como ejemplo:
    this.toast.mostrar('Compra pulsada', 'info');
  }

  onAdmin(): void {
    this.admin.abrir();
  }
}
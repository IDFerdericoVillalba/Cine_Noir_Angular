import { Component, signal } from '@angular/core';
import { Header } from './header/header';
import { Carousel } from './carousel/carousel';

@Component({
  selector: 'app-root',
  imports: [Header, Carousel],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('Cine_noir_angular');

  onComprar(peliculaId: number): void {
    console.log('Comprar película', peliculaId);
  }

  onAdmin(): void {
    console.log('Abrir panel de administración');
  }
}
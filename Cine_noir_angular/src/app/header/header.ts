import { Component, HostListener, output, signal } from '@angular/core';

const THEME_KEY = 'cineTheme';

@Component({
  standalone: true,
  imports: [],
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header {
  /** Se emite al pulsar "Admin & BD". */
  admin = output<void>();

  menuOpen = signal(false);
  dark = signal(false);
  active = signal('#hero');

  links = [
    { href: '#hero', label: 'Inicio' },
    { href: '#cartelera', label: 'Cartelera' },
    { href: '#alimentos', label: 'Combos' },
    { href: '#filmstrip', label: '35mm Reel' },
    { href: '#directores', label: 'Wanted' },
    { href: '#taquilla', label: 'Taquilla' },
    { href: '#contacto', label: 'Contacto' }
  ];

  constructor() {
    let saved: string | null = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch { /* ignorar */ }
    this.dark.set(saved === 'dark');
    this.applyTheme();
  }

  toggleTheme(): void {
    this.dark.update(v => !v);
    this.applyTheme();
    try { localStorage.setItem(THEME_KEY, this.dark() ? 'dark' : 'light'); } catch { /* ignorar */ }
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.dark() ? 'dark' : 'light');
  }

  toggleMenu(): void { this.menuOpen.update(v => !v); }
  closeMenu(): void { this.menuOpen.set(false); }

  go(href: string): void {
    this.active.set(href);
    this.closeMenu();
  }

  openAdmin(): void {
    this.closeMenu();
    this.admin.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeMenu(); }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 1239) this.closeMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    if (!(e.target as HTMLElement).closest('.site-header')) this.closeMenu();
  }
}
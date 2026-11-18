import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface HeroMovie {
  title: string;
  video: string;
  meta: string[];
  description: string;
  ticketId?: number;
}

interface Slide extends HeroMovie {
  id: string;
  thumb: string;
  bgUrl: SafeResourceUrl;
}

const HERO_MOVIES: HeroMovie[] = [
  {
    title: 'Dune: Parte Dos',
    video: 'https://www.youtube.com/watch?v=pMe_te9QUa0',
    meta: ['2024', 'Ciencia ficción', 'IMAX 70mm'],
    description: 'Paul Atreides se une a los Fremen para vengar a su familia y enfrentar un destino que puede cambiar el universo.',
    ticketId: 1
  },
  {
    title: 'Spider-Man: Across the Spider-Verse',
    video: 'https://www.youtube.com/watch?v=oBmazlyP220',
    meta: ['2023', 'Animación', 'Aventura'],
    description: 'Miles Morales viaja por el multiverso, conoce a un equipo de Spider-People y debe decidir qué clase de héroe quiere ser.',
    ticketId: 2
  },
  {
    title: 'Oppenheimer',
    video: 'https://www.youtube.com/watch?v=gMPEbJQun68',
    meta: ['2023', 'Drama histórico', 'Biografía'],
    description: 'La historia de J. Robert Oppenheimer y del Proyecto Manhattan, el esfuerzo científico que cambió el rumbo del siglo XX.',
    ticketId: 3
  },
  {
    title: 'Deadpool & Wolverine',
    video: 'https://www.youtube.com/watch?v=uDzfa0w86Vw',
    meta: ['2024', 'Acción', 'Comedia'],
    description: 'Wade Wilson es reclutado por la TVA y tiene que aliarse con un Wolverine reacio para salvar su universo.',
    ticketId: 6
  }
];

const SOUND_KEY = 'hcSound';
const FALLBACK_SECONDS = 65;

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.html',
  styleUrls: ['./carousel.css'],
  standalone: true,
  imports: [CommonModule]
})
export class Carousel implements OnInit, OnDestroy {
  /** Se emite con el id de la película cuando se pulsa "Comprar boletos". */
  comprar = output<number>();

  @ViewChild('bgFrame') bgFrame?: ElementRef<HTMLIFrameElement>;

  slides: Slide[] = [];
  current = signal(0);
  progress = signal(0);
  ready = signal(false);
  frameVisible = signal(true);
  modalUrl = signal<SafeResourceUrl | null>(null);
  modalTitle = signal('');

  soundOn = signal(true);
  unlocked = signal(false);
  playing = computed(() => this.soundOn() && this.unlocked());
  soundText = computed(() =>
    this.playing() ? 'Activado'
      : this.soundOn() ? 'Haz clic en la página para activar el sonido'
        : 'Desactivado'
  );

  private ended = false;
  private fallbackTimer?: ReturnType<typeof setTimeout>;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private touchX: number | null = null;

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.slides = HERO_MOVIES.map(m => {
      const id = this.ytId(m.video);
      return {
        ...m,
        id,
        thumb: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        bgUrl: this.sanitizer.bypassSecurityTrustResourceUrl(this.bgEmbed(id))
      };
    });

    try { this.soundOn.set(localStorage.getItem(SOUND_KEY) !== 'off'); } catch { /* ignorar */ }
    this.unlocked.set(!!navigator.userActivation?.hasBeenActive);
    this.show(0);
  }

  ngOnDestroy(): void {
    clearTimeout(this.fallbackTimer);
    this.timers.forEach(clearTimeout);
  }

  // ---------- Utilidades de YouTube ----------
  private ytId(url: string): string {
    const m = String(url).match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    return m ? m[1] : url;
  }

  private bgEmbed(id: string): string {
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1` +
      `&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1` +
      (location.protocol.startsWith('http') ? `&origin=${encodeURIComponent(location.origin)}` : '');
  }

  private ytCmd(func: string, args: unknown[] = []): void {
    this.bgFrame?.nativeElement.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }), '*'
    );
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }

  // ---------- Sonido ----------
  private applySound(): void {
    if (this.playing()) {
      this.ytCmd('unMute');
      this.ytCmd('setVolume', [100]);
      this.ytCmd('playVideo');
    } else {
      this.ytCmd('mute');
    }
  }

  @HostListener('document:pointerdown')
  @HostListener('document:pointerup')
  @HostListener('document:keydown')
  @HostListener('document:touchend')
  unlock(): void {
    if (this.unlocked()) return;
    this.unlocked.set(true);
    this.applySound();
  }

  toggleSound(): void {
    if (this.soundOn() && !this.unlocked()) {
      this.unlocked.set(true);
    } else {
      this.soundOn.update(v => !v);
      this.unlocked.set(true);
    }
    try { localStorage.setItem(SOUND_KEY, this.soundOn() ? 'on' : 'off'); } catch { /* ignorar */ }
    this.applySound();
  }

  // ---------- Diapositivas ----------
  show(index: number): void {
    const n = this.slides.length;
    this.current.set((index + n) % n);
    this.ended = false;
    this.progress.set(0);
    this.ready.set(false);
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.armFallback();
  }

  prev(): void { this.show(this.current() - 1); }
  next(): void { this.show(this.current() + 1); }

  onFrameLoad(): void {
    this.later(() => this.ready.set(true), 1200);
    [300, 1000, 2500].forEach(ms => this.later(() => this.listen(), ms));
    [900, 2500].forEach(ms => this.later(() => this.applySound(), ms));
  }

  private listen(): void {
    this.bgFrame?.nativeElement.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'
    );
  }

  private armFallback(ms?: number): void {
    clearTimeout(this.fallbackTimer);
    this.fallbackTimer = setTimeout(() => this.onEnded(), ms ?? FALLBACK_SECONDS * 1000);
  }

  private onEnded(): void {
    if (this.ended || this.modalUrl()) return;
    this.ended = true;
    if (this.slides.length === 1) {
      // con una sola película, se recarga el iframe
      this.frameVisible.set(false);
      setTimeout(() => this.frameVisible.set(true));
    }
    this.show(this.current() + 1);
  }

  @HostListener('window:message', ['$event'])
  onMessage(e: MessageEvent): void {
    if (e.origin !== 'https://www.youtube.com') return;
    const frame = this.bgFrame?.nativeElement;
    if (!frame || e.source !== frame.contentWindow) return;

    let d: any = e.data;
    if (typeof d === 'string') {
      try { d = JSON.parse(d); } catch { return; }
    }
    if (!d) return;

    if (d.event === 'onStateChange' && d.info === 0) { this.onEnded(); return; }
    if (d.event === 'infoDelivery' && d.info) {
      if (d.info.playerState === 0) { this.onEnded(); return; }
      if (d.info.duration > 0 && typeof d.info.currentTime === 'number') {
        this.progress.set(Math.max(0, Math.min(1, d.info.currentTime / d.info.duration)));
        this.armFallback((d.info.duration - d.info.currentTime + 4) * 1000);
      }
    }
  }

  // ---------- Teclado y táctil ----------
  onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft') this.prev();
    if (e.key === 'ArrowRight') this.next();
  }
  onTouchStart(e: TouchEvent): void { this.touchX = e.touches[0].clientX; }
  onTouchEnd(e: TouchEvent): void {
    if (this.touchX === null) return;
    const dx = e.changedTouches[0].clientX - this.touchX;
    if (Math.abs(dx) > 50) this.show(this.current() + (dx < 0 ? 1 : -1));
    this.touchX = null;
  }

  // ---------- Modal del tráiler ----------
  openTrailer(slide: Slide): void {
    this.modalTitle.set(slide.title);
    this.modalUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${slide.id}?autoplay=1&rel=0&modestbranding=1`
    ));
    clearTimeout(this.fallbackTimer);
  }

  @HostListener('document:keydown.escape')
  closeTrailer(): void {
    if (!this.modalUrl()) return;
    this.modalUrl.set(null);
    this.show(this.current());
  }

  onComprar(slide: Slide): void {
    if (slide.ticketId != null) this.comprar.emit(slide.ticketId);
  }
}
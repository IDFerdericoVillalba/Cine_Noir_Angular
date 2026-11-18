import { Injectable, signal } from '@angular/core';

/**
 * Toast service that stores toast messages in a signal.
 * The UI component (ToastContainer) reads this signal and renders the toasts.
 */
@Injectable({
  providedIn: 'root'
})
export class Toast {
  // Cada mensaje tiene un id único para facilitar su eliminación.
  private _messages = signal<ToastMessage[]>([]);
  /** Lectura de los mensajes actuales (usado por la UI). */
  readonly messages = this._messages.asReadonly();

  /** Mostrar un toast.
   * @param msg  Texto a mostrar.
   * @param tipo Tipo de mensaje: 'error' | 'success' | 'info'.
   */
  mostrar(msg: string, tipo: 'error' | 'success' | 'info' = 'info'): void {
    const id = Date.now(); // id simple basado en timestamp
    const newMsg: ToastMessage = { id, msg, tipo };
    this._messages.update((list) => [...list, newMsg]);
    // Auto‑desaparece después de 3 s (3000 ms)
    setTimeout(() => this._remove(id), 3000);
  }

  /** Elimina un mensaje por su id. */
  private _remove(id: number): void {
    this._messages.update((list) => list.filter((m) => m.id !== id));
  }
}

/** Modelo interno de un mensaje de toast. */
interface ToastMessage {
  id: number;
  msg: string;
  tipo: 'error' | 'success' | 'info';
}

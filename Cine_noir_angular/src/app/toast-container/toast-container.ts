import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { Toast } from '../services/toast';

/**
 * UI component that displays toast notifications stored in the Toast service.
 * It reads the `messages` signal from the service and renders each toast.
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.html',
  styleUrls: ['./toast-container.css']
})
export class ToastContainer {
  private toastService = inject(Toast);
  // Expose the readonly signal for the template.
  readonly messages = this.toastService.messages;
}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="text-center py-24 px-4">
      <h1 class="text-6xl font-bold text-green-600 mb-4">404</h1>
      <p class="text-gray-500 mb-8">Page introuvable.</p>
      <a routerLink="/" class="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
        ← Retour à l'accueil
      </a>
    </div>
  `,
})
export class NotFound {}

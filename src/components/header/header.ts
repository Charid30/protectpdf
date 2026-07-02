import { Component, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
})
export class Header {
  menuOuvert = signal(false);
  outilsOuverts = signal(false);

  toggleMenu() { this.menuOuvert.update(v => !v); }
  toggleOutils() { this.outilsOuverts.update(v => !v); }
  fermerOutils() { this.outilsOuverts.set(false); }
  fermerMenu() { this.menuOuvert.set(false); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('#outils-dropdown')) {
      this.outilsOuverts.set(false);
    }
  }
}

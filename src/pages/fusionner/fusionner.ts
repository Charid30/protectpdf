import { Component, signal } from '@angular/core';
import { SecurService } from '../../services/secur.service';

@Component({
  selector: 'app-fusionner',
  standalone: true,
  templateUrl: './fusionner.html',
})
export class Fusionner {
  fichiers: File[] = [];
  isDragOver = signal(false);
  erreur = signal<string | null>(null);
  chargement = signal(false);
  succes = signal(false);

  readonly TAILLE_MAX = 20 * 1024 * 1024;
  readonly MAX_FICHIERS = 10;

  constructor(private securService: SecurService) {}

  onDragOver(event: DragEvent) { event.preventDefault(); this.isDragOver.set(true); }
  onDragLeave() { this.isDragOver.set(false); }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files) this.ajouterFichiers(Array.from(files));
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.ajouterFichiers(Array.from(input.files));
      input.value = '';
    }
  }

  ajouterFichiers(nouveaux: File[]) {
    this.erreur.set(null);
    this.succes.set(false);
    for (const f of nouveaux) {
      if (this.fichiers.length >= this.MAX_FICHIERS) {
        this.erreur.set(`Maximum ${this.MAX_FICHIERS} fichiers autorisés.`);
        break;
      }
      if (f.type !== 'application/pdf') {
        this.erreur.set(`"${f.name}" n'est pas un PDF.`);
        continue;
      }
      if (f.size > this.TAILLE_MAX) {
        this.erreur.set(`"${f.name}" dépasse la limite de 20 Mo.`);
        continue;
      }
      this.fichiers.push(f);
    }
  }

  supprimerFichier(index: number) {
    this.fichiers.splice(index, 1);
    this.erreur.set(null);
    this.succes.set(false);
  }

  monterFichier(index: number) {
    if (index === 0) return;
    [this.fichiers[index - 1], this.fichiers[index]] = [this.fichiers[index], this.fichiers[index - 1]];
  }

  descendreFichier(index: number) {
    if (index === this.fichiers.length - 1) return;
    [this.fichiers[index], this.fichiers[index + 1]] = [this.fichiers[index + 1], this.fichiers[index]];
  }

  formaterTaille(octets: number): string {
    if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
    return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
  }

  get tailleTotale(): string {
    const total = this.fichiers.reduce((acc, f) => acc + f.size, 0);
    return this.formaterTaille(total);
  }

  fusionner() {
    this.erreur.set(null);
    this.succes.set(false);

    if (this.fichiers.length < 2) {
      this.erreur.set('Veuillez ajouter au moins 2 fichiers PDF à fusionner.');
      return;
    }

    this.chargement.set(true);

    this.securService.fusionner(this.fichiers).subscribe({
      next: (response) => {
        const blob = response.body!;
        this.securService.telechargerBlob(blob, 'document-fusionne.pdf');
        this.chargement.set(false);
        this.succes.set(true);
      },
      error: (err) => {
        this.chargement.set(false);
        this.securService.parseErreurBlob(err).then(msg => this.erreur.set(msg));
      },
    });
  }
}

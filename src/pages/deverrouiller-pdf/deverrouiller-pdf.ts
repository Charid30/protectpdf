import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SecurService } from '../../services/secur.service';

@Component({
  selector: 'app-deverrouiller-pdf',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './deverrouiller-pdf.html',
})
export class DeverrouillerPDF {
  fichierSelectionne: File | null = null;
  isDragOver = signal(false);
  erreur = signal<string | null>(null);
  chargement = signal(false);
  succes = signal(false);

  motDePasse = '';
  afficherMotDePasse = false;

  readonly TAILLE_MAX = 20 * 1024 * 1024;

  constructor(private securService: SecurService) {}

  onDragOver(event: DragEvent) { event.preventDefault(); this.isDragOver.set(true); }
  onDragLeave() { this.isDragOver.set(false); }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) this.traiterFichier(files[0]);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.traiterFichier(input.files[0]);
  }

  traiterFichier(fichier: File) {
    this.erreur.set(null);
    this.succes.set(false);
    if (fichier.type !== 'application/pdf') {
      this.erreur.set('Seuls les fichiers PDF sont acceptés.');
      return;
    }
    if (fichier.size > this.TAILLE_MAX) {
      this.erreur.set('Le fichier dépasse la limite de 20 Mo.');
      return;
    }
    this.fichierSelectionne = fichier;
  }

  supprimerFichier() {
    this.fichierSelectionne = null;
    this.erreur.set(null);
    this.succes.set(false);
  }

  get tailleFichier(): string {
    const s = this.fichierSelectionne?.size ?? 0;
    if (s < 1024 * 1024) return `${(s / 1024).toFixed(1)} Ko`;
    return `${(s / (1024 * 1024)).toFixed(1)} Mo`;
  }

  deverrouiller() {
    this.erreur.set(null);
    this.succes.set(false);

    if (!this.fichierSelectionne) {
      this.erreur.set('Veuillez sélectionner un fichier PDF.');
      return;
    }

    this.chargement.set(true);

    this.securService.deverrouillerPDF(this.fichierSelectionne, this.motDePasse.trim()).subscribe({
      next: (response) => {
        const blob = response.body!;
        const nomOriginal = this.fichierSelectionne!.name.replace(/\.pdf$/i, '');
        this.securService.telechargerBlob(blob, `${nomOriginal}-deverrouille.pdf`);
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

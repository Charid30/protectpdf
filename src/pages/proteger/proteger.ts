import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SecurService, OptionsSecurisation } from '../../services/secur.service';

@Component({
  selector: 'app-proteger',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './proteger.html',
})
export class Proteger {
  // Fichier
  fichierSelectionne: File | null = null;
  isDragOver = signal(false);
  erreur = signal<string | null>(null);
  chargement = signal(false);

  // Options de restriction
  interdireCopie = true;
  interdireImpression = false;
  interdireModification = false;
  interdireAnnotations = false;

  // Mot de passe
  motDePasseOuverture = '';
  afficherMotDePasse = false;

  // Chiffrement
  chiffrement: 'aes128' | 'aes256' = 'aes256';

  readonly TAILLE_MAX = 20 * 1024 * 1024;

  constructor(private router: Router, private securService: SecurService) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

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
  }

  get aucuneRestriction(): boolean {
    return !this.interdireCopie && !this.interdireImpression &&
           !this.interdireModification && !this.interdireAnnotations &&
           !this.motDePasseOuverture.trim();
  }

  get tailleFichier(): string {
    if (!this.fichierSelectionne) return '';
    const s = this.fichierSelectionne.size;
    if (s < 1024 * 1024) return `${(s / 1024).toFixed(1)} Ko`;
    return `${(s / (1024 * 1024)).toFixed(1)} Mo`;
  }

  securiser() {
    this.erreur.set(null);

    if (!this.fichierSelectionne) {
      this.erreur.set('Veuillez sélectionner un fichier PDF.');
      return;
    }
    if (this.aucuneRestriction) {
      this.erreur.set('Veuillez sélectionner au moins une restriction ou définir un mot de passe.');
      return;
    }
    if (this.motDePasseOuverture && this.motDePasseOuverture.length < 4) {
      this.erreur.set('Le mot de passe doit contenir au moins 4 caractères.');
      return;
    }

    const options: OptionsSecurisation = {
      motDePasseOuverture: this.motDePasseOuverture.trim(),
      interdireCopie: this.interdireCopie,
      interdireImpression: this.interdireImpression,
      interdireModification: this.interdireModification,
      interdireAnnotations: this.interdireAnnotations,
      chiffrement: this.chiffrement,
    };

    this.chargement.set(true);

    this.securService.securiser(this.fichierSelectionne, options).subscribe({
      next: (response) => {
        const blob = response.body!;
        const nomOriginal = this.fichierSelectionne!.name.replace(/\.pdf$/i, '');
        const nomFichier = `${nomOriginal}-securise.pdf`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomFichier;
        a.click();
        URL.revokeObjectURL(url);

        this.securService.setResultat(nomFichier, options);
        this.chargement.set(false);
        this.router.navigate(['/resultat']);
      },
      error: (err) => {
        this.chargement.set(false);
        this.erreur.set(err?.error?.erreur || 'Une erreur est survenue. Veuillez réessayer.');
      },
    });
  }
}

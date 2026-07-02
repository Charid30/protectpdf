import { Component, signal, OnDestroy } from '@angular/core';
import { SecurService } from '../../services/secur.service';

@Component({
  selector: 'app-compresser',
  standalone: true,
  templateUrl: './compresser.html',
})
export class Compresser implements OnDestroy {
  fichierSelectionne: File | null = null;
  isDragOver = signal(false);
  erreur = signal<string | null>(null);
  chargement = signal(false);
  tailleOriginale = signal<number | null>(null);
  tailleCompresse = signal<number | null>(null);
  secondes = signal(0);

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  readonly TAILLE_MAX = 20 * 1024 * 1024;

  constructor(private securService: SecurService) {}

  ngOnDestroy() { this.arreterTimer(); }

  private demarrerTimer() {
    this.secondes.set(0);
    this.timerInterval = setInterval(() => this.secondes.update(s => s + 1), 1000);
  }

  private arreterTimer() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  get labelChargement(): string {
    const s = this.secondes();
    if (s < 5) return 'Envoi du fichier…';
    if (s < 20) return `Compression en cours… ${s}s`;
    return `Toujours en cours… ${s}s — veuillez patienter`;
  }

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
    this.tailleOriginale.set(null);
    this.tailleCompresse.set(null);
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
    this.tailleOriginale.set(null);
    this.tailleCompresse.set(null);
  }

  get tailleFichier(): string {
    return this.formaterTaille(this.fichierSelectionne?.size ?? 0);
  }

  formaterTaille(octets: number): string {
    if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
    return `${(octets / (1024 * 1024)).toFixed(2)} Mo`;
  }

  get gainPourcentage(): number {
    const orig = this.tailleOriginale();
    const comp = this.tailleCompresse();
    if (!orig || !comp) return 0;
    return Math.round(((orig - comp) / orig) * 100);
  }

  compresser() {
    this.erreur.set(null);
    if (!this.fichierSelectionne) {
      this.erreur.set('Veuillez sélectionner un fichier PDF.');
      return;
    }

    this.chargement.set(true);
    this.tailleOriginale.set(null);
    this.tailleCompresse.set(null);
    this.demarrerTimer();

    this.securService.compresser(this.fichierSelectionne).subscribe({
      next: (response) => {
        this.arreterTimer();
        const orig = Number(response.headers.get('X-Taille-Originale'));
        const comp = Number(response.headers.get('X-Taille-Compresse'));
        this.tailleOriginale.set(orig || this.fichierSelectionne!.size);
        this.tailleCompresse.set(comp || response.body!.size);

        const blob = response.body!;
        const nomOriginal = this.fichierSelectionne!.name.replace(/\.pdf$/i, '');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nomOriginal}-compresse.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        this.chargement.set(false);
      },
      error: (err) => {
        this.arreterTimer();
        this.chargement.set(false);
        this.securService.parseErreurBlob(err).then(msg => this.erreur.set(msg));
      },
    });
  }
}

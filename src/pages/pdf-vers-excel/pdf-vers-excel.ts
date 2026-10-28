import { Component, signal, OnDestroy } from '@angular/core';
import { SecurService } from '../../services/secur.service';

@Component({
  selector: 'app-pdf-vers-excel',
  standalone: true,
  templateUrl: './pdf-vers-excel.html',
})
export class PdfVersExcel implements OnDestroy {
  fichierSelectionne: File | null = null;
  isDragOver = signal(false);
  erreur = signal<string | null>(null);
  chargement = signal(false);
  termine = signal(false);
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
    if (s < 20) return `Conversion en cours… ${s}s`;
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
    this.termine.set(false);
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
    this.termine.set(false);
  }

  get tailleFichier(): string {
    const octets = this.fichierSelectionne?.size ?? 0;
    if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
    return `${(octets / (1024 * 1024)).toFixed(2)} Mo`;
  }

  convertir() {
    this.erreur.set(null);
    if (!this.fichierSelectionne) {
      this.erreur.set('Veuillez sélectionner un fichier PDF.');
      return;
    }

    this.chargement.set(true);
    this.termine.set(false);
    this.demarrerTimer();

    this.securService.convertirEnExcel(this.fichierSelectionne).subscribe({
      next: (response) => {
        this.arreterTimer();
        const blob = new Blob([response.body!], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const nomOriginal = this.fichierSelectionne!.name.replace(/\.pdf$/i, '');
        this.securService.telechargerBlob(blob, `${nomOriginal}.xlsx`);
        this.termine.set(true);
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

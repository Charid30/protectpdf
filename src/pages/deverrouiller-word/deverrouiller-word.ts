import { Component, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { SecurService } from '../../services/secur.service';

const TYPES_WORD = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

export type StatutJob = 'en_cours' | 'succes' | 'echec' | null;

interface EtapeInfo { label: string; }

@Component({
  selector: 'app-deverrouiller-word',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './deverrouiller-word.html',
})
export class DeverrouillerWord implements OnDestroy {
  fichierSelectionne: File | null = null;
  isDragOver = signal(false);
  erreur = signal<string | null>(null);
  chargement = signal(false);
  succes = signal(false);

  connaitMotDePasse: boolean | null = null;
  motDePasse = '';
  afficherMotDePasse = false;

  // Brute-force
  estChiffre = signal(false);
  emailRecuperation = '';
  chargementBrute = signal(false);

  // Suivi du job
  jobId = signal<string | null>(null);
  jobStatut = signal<StatutJob>(null);
  jobEtape = signal<string>('demarrage');
  jobProgression = signal<number>(0);
  jobMotDePasse = signal<string | null>(null);
  motDePasseVisible = false;

  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  readonly TAILLE_MAX = 20 * 1024 * 1024;

  readonly ETAPES: Record<string, EtapeInfo> = {
    demarrage:      { label: 'Démarrage' },
    dictionnaire:   { label: 'Dictionnaire de mots de passe' },
    numerique:      { label: 'Combinaisons numériques' },
    alphanumerique: { label: 'Combinaisons alphanumériques' },
  };

  constructor(private securService: SecurService) {}

  ngOnDestroy() { this.arreterPolling(); }

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
    this.reinitialiser();
    const ext = fichier.name.split('.').pop()?.toLowerCase() ?? '';
    const typeOk = TYPES_WORD.includes(fichier.type) || ['doc', 'docx'].includes(ext);
    if (!typeOk) { this.erreur.set('Seuls les fichiers Word (.doc, .docx) sont acceptés.'); return; }
    if (fichier.size > this.TAILLE_MAX) { this.erreur.set('Le fichier dépasse la limite de 20 Mo.'); return; }
    this.fichierSelectionne = fichier;
  }

  supprimerFichier() { this.reinitialiser(); this.fichierSelectionne = null; }

  reinitialiser() {
    this.erreur.set(null);
    this.succes.set(false);
    this.estChiffre.set(false);
    this.connaitMotDePasse = null;
    this.motDePasse = '';
    this.emailRecuperation = '';
    this.jobId.set(null);
    this.jobStatut.set(null);
    this.jobEtape.set('demarrage');
    this.jobProgression.set(0);
    this.jobMotDePasse.set(null);
    this.motDePasseVisible = false;
    this.arreterPolling();
  }

  choisirOption(connait: boolean) {
    this.connaitMotDePasse = connait;
    this.erreur.set(null);
    this.estChiffre.set(false);
    this.jobId.set(null);
    this.jobStatut.set(null);
    this.motDePasse = '';
    this.arreterPolling();
  }

  get tailleFichier(): string {
    const s = this.fichierSelectionne?.size ?? 0;
    return s < 1024 * 1024 ? `${(s / 1024).toFixed(1)} Ko` : `${(s / (1024 * 1024)).toFixed(1)} Mo`;
  }

  get extensionFichier(): string {
    return this.fichierSelectionne?.name.split('.').pop()?.toLowerCase() ?? 'docx';
  }

  get peutSoumettre(): boolean {
    if (!this.fichierSelectionne || this.connaitMotDePasse === null) return false;
    if (this.connaitMotDePasse && !this.motDePasse.trim()) return false;
    return true;
  }

  get etapeActuelle(): EtapeInfo {
    return this.ETAPES[this.jobEtape()] ?? { label: this.jobEtape(), icone: '🔍' };
  }

  etapeTerminee(etape: string): boolean {
    const ordre = ['demarrage', 'dictionnaire', 'numerique', 'alphanumerique'];
    return ordre.indexOf(this.jobEtape()) > ordre.indexOf(etape);
  }

  get lienTelechargement(): string {
    return `${environment.apiUrl}/bruteforce-word/${this.jobId()}/download`;
  }

  // ── Déverrouillage classique ─────────────────────────────────────────────

  deverrouiller() {
    this.erreur.set(null);
    this.succes.set(false);
    this.estChiffre.set(false);

    if (!this.fichierSelectionne) { this.erreur.set('Veuillez sélectionner un fichier Word.'); return; }
    if (this.connaitMotDePasse === null) { this.erreur.set('Veuillez indiquer si vous connaissez le mot de passe.'); return; }
    if (this.connaitMotDePasse && !this.motDePasse.trim()) { this.erreur.set('Veuillez saisir le mot de passe.'); return; }

    this.chargement.set(true);

    this.securService
      .deverrouillerWord(this.fichierSelectionne, this.motDePasse.trim(), this.connaitMotDePasse)
      .subscribe({
        next: (response) => {
          const blob = response.body!;
          const nomOriginal = this.fichierSelectionne!.name.replace(/\.(docx?|doc)$/i, '');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `${nomOriginal}-deverrouille.${this.extensionFichier}`; a.click();
          URL.revokeObjectURL(url);
          this.chargement.set(false);
          this.succes.set(true);
        },
        error: (err) => {
          this.chargement.set(false);
          this.securService.parseErreurBlob(err).then(msg => {
            this.erreur.set(msg);
            if (msg.includes('chiffré') || msg.includes('impossible')) this.estChiffre.set(true);
          });
        },
      });
  }

  // ── Brute-force ──────────────────────────────────────────────────────────

  lancerBruteforce() {
    const email = this.emailRecuperation.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.erreur.set('Adresse email invalide (ou laissez le champ vide pour ne pas recevoir d\'email).');
      return;
    }
    if (!this.fichierSelectionne) return;

    this.chargementBrute.set(true);
    this.erreur.set(null);

    this.securService.soumettreJobBruteforce(this.fichierSelectionne, email).subscribe({
      next: (res) => {
        this.chargementBrute.set(false);
        this.jobId.set(res.jobId);
        this.jobStatut.set('en_cours');
        this.estChiffre.set(false);
        this.demarrerPolling(res.jobId);
      },
      error: (err) => {
        this.chargementBrute.set(false);
        this.erreur.set(err?.error?.erreur || 'Erreur lors du lancement. Réessayez.');
      },
    });
  }

  private demarrerPolling(jobId: string) {
    this.arreterPolling();
    this.pollingInterval = setInterval(() => {
      this.securService.verifierStatutJob(jobId).subscribe({
        next: (res) => {
          this.jobStatut.set(res.statut as StatutJob);
          this.jobEtape.set(res.etape);
          this.jobProgression.set(res.progression);
          if (res.motDePasse) this.jobMotDePasse.set(res.motDePasse);
          if (res.statut === 'succes' || res.statut === 'echec') this.arreterPolling();
        },
        error: () => this.arreterPolling(),
      });
    }, 3000);
  }

  private arreterPolling() {
    if (this.pollingInterval) { clearInterval(this.pollingInterval); this.pollingInterval = null; }
  }

  telechargerResultat() {
    const a = document.createElement('a');
    a.href = this.lienTelechargement;
    const nomOriginal = this.fichierSelectionne?.name.replace(/\.(docx?|doc)$/i, '') ?? 'fichier';
    a.download = `${nomOriginal}-deverrouille.${this.extensionFichier}`;
    a.click();
  }
}

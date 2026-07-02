import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { environment } from '../environments/environment';

// 4 minutes — suffisant pour Ghostscript sur gros PDF via connexion mobile lente
const TIMEOUT_MS = 4 * 60 * 1000;

export interface OptionsSecurisation {
  motDePasseOuverture: string;
  interdireCopie: boolean;
  interdireImpression: boolean;
  interdireModification: boolean;
  interdireAnnotations: boolean;
  chiffrement: 'aes128' | 'aes256';
}

@Injectable({ providedIn: 'root' })
export class SecurService {
  private readonly apiUrl = environment.apiUrl;

  nomFichier = signal<string>('');
  optionsAppliquees = signal<OptionsSecurisation | null>(null);

  constructor(private http: HttpClient) {}

  setResultat(nomFichier: string, options: OptionsSecurisation) {
    this.nomFichier.set(nomFichier);
    this.optionsAppliquees.set(options);
  }

  securiser(fichier: File, options: OptionsSecurisation) {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('motDePasseOuverture', options.motDePasseOuverture);
    formData.append('interdireCopie', String(options.interdireCopie));
    formData.append('interdireImpression', String(options.interdireImpression));
    formData.append('interdireModification', String(options.interdireModification));
    formData.append('interdireAnnotations', String(options.interdireAnnotations));
    formData.append('chiffrement', options.chiffrement);
    return this.http.post(`${this.apiUrl}/securiser`, formData, {
      responseType: 'blob',
      observe: 'response',
    }).pipe(timeout(TIMEOUT_MS));
  }

  compresser(fichier: File) {
    const formData = new FormData();
    formData.append('fichier', fichier);
    return this.http.post(`${this.apiUrl}/compresser`, formData, {
      responseType: 'blob',
      observe: 'response',
    }).pipe(timeout(TIMEOUT_MS));
  }

  deverrouillerPDF(fichier: File, motDePasse: string) {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('motDePasse', motDePasse);
    return this.http.post(`${this.apiUrl}/deverrouiller-pdf`, formData, {
      responseType: 'blob',
      observe: 'response',
    }).pipe(timeout(TIMEOUT_MS));
  }

  deverrouillerWord(fichier: File, motDePasse: string, connaitMotDePasse: boolean) {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('motDePasse', motDePasse);
    formData.append('connaitMotDePasse', String(connaitMotDePasse));
    return this.http.post(`${this.apiUrl}/deverrouiller-word`, formData, {
      responseType: 'blob',
      observe: 'response',
    }).pipe(timeout(TIMEOUT_MS));
  }

  soumettreJobBruteforce(fichier: File, email: string) {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('email', email);
    return this.http.post<{ jobId: string; message: string }>(`${this.apiUrl}/bruteforce-word`, formData)
      .pipe(timeout(TIMEOUT_MS));
  }

  verifierStatutJob(jobId: string) {
    return this.http.get<{ statut: string; etape: string; progression: number; motDePasse?: string }>(`${this.apiUrl}/bruteforce-word/${jobId}`);
  }

  /**
   * Téléchargement compatible mobile (iOS Safari bloque a.click() sur blob URL).
   * On crée un lien temporaire, on le met dans le DOM, on clique, puis on nettoie.
   */
  telechargerBlob(blob: Blob, nomFichier: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichier;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Délai avant révocation — iOS a besoin de temps pour initier le téléchargement
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 300);
  }

  /** Quand responseType est 'blob', les erreurs arrivent aussi en Blob — il faut les lire. */
  parseErreurBlob(err: any): Promise<string> {
    if (err?.name === 'TimeoutError') {
      return Promise.resolve('La connexion a pris trop de temps. Vérifiez votre connexion internet et réessayez avec un fichier plus petit.');
    }
    const defaut = 'Une erreur est survenue. Veuillez réessayer.';
    if (err?.error instanceof Blob) {
      return err.error.text().then((text: string) => {
        try { return JSON.parse(text)?.erreur || defaut; } catch { return defaut; }
      });
    }
    return Promise.resolve(err?.error?.erreur || defaut);
  }

  fusionner(fichiers: File[]) {
    const formData = new FormData();
    fichiers.forEach(f => formData.append('fichiers', f));
    return this.http.post(`${this.apiUrl}/fusionner`, formData, {
      responseType: 'blob',
      observe: 'response',
    });
  }
}

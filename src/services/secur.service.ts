import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

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
    });
  }
}

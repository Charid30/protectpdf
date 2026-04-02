import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SecurService } from '../../services/secur.service';

@Component({
  selector: 'app-resultat',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './resultat.html',
})
export class Resultat {
  constructor(public securService: SecurService) {}

  get restrictions(): string[] {
    const opts = this.securService.optionsAppliquees();
    if (!opts) return [];
    const liste: string[] = [];
    if (opts.interdireCopie)        liste.push('Copie interdite');
    if (opts.interdireImpression)   liste.push('Impression interdite');
    if (opts.interdireModification) liste.push('Modification interdite');
    if (opts.interdireAnnotations)  liste.push('Annotations interdites');
    if (opts.motDePasseOuverture)   liste.push('Mot de passe requis à l\'ouverture');
    return liste;
  }

  get niveauChiffrement(): string {
    return this.securService.optionsAppliquees()?.chiffrement === 'aes256' ? 'AES-256' : 'AES-128';
  }
}

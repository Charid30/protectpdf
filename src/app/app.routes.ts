import { Routes } from '@angular/router';
import { Accueil } from '../pages/accueil/accueil';
import { Proteger } from '../pages/proteger/proteger';
import { Resultat } from '../pages/resultat/resultat';
import { NotFound } from '../pages/not-found/not-found';

export const routes: Routes = [
  { path: '', component: Accueil },
  { path: 'proteger', component: Proteger },
  { path: 'resultat', component: Resultat },
  { path: '**', component: NotFound },
];

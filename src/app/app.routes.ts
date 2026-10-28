import { Routes } from '@angular/router';
import { Accueil } from '../pages/accueil/accueil';
import { Proteger } from '../pages/proteger/proteger';
import { Resultat } from '../pages/resultat/resultat';
import { Compresser } from '../pages/compresser/compresser';
import { DeverrouillerPDF } from '../pages/deverrouiller-pdf/deverrouiller-pdf';
import { DeverrouillerWord } from '../pages/deverrouiller-word/deverrouiller-word';
import { Fusionner } from '../pages/fusionner/fusionner';
import { PdfVersExcel } from '../pages/pdf-vers-excel/pdf-vers-excel';
import { NotFound } from '../pages/not-found/not-found';

export const routes: Routes = [
  { path: '', component: Accueil },
  { path: 'proteger', component: Proteger },
  { path: 'resultat', component: Resultat },
  { path: 'compresser', component: Compresser },
  { path: 'deverrouiller-pdf', component: DeverrouillerPDF },
  { path: 'deverrouiller-word', component: DeverrouillerWord },
  { path: 'fusionner', component: Fusionner },
  { path: 'pdf-vers-excel', component: PdfVersExcel },
  { path: '**', component: NotFound },
];

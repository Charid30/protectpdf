import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="bg-gray-900 text-gray-400 text-center text-sm py-5 mt-auto">
      <p>© {{ annee }} SecurPDFBF — Protection de documents au Burkina Faso</p>
    </footer>
  `,
})
export class Footer {
  annee = new Date().getFullYear();
}

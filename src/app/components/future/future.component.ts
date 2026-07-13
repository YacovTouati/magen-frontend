import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-future',
    standalone: true,
    imports: [CommonModule],
    template: `
  <section class="section-card">
    <h3>⚙️ פיתוחים עתידיים ומודולים בהקמה</h3>
    <p class="section-desc">מודולים עתידיים שיפותחו בהמשך הדרך.</p>
  </section>
  `
})
export class FutureComponent { }

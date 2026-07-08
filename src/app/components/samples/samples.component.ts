import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-samples',
  standalone: true,
  imports: [CommonModule],
  template: `
  <section class="section-card">
    <h3>📚 תרחישים ושיחות לדוגמה (ספריית הדרכה)</h3>
    <p class="section-desc">כאן יופיעו פרוטוקולים, דוגמאות לשיחות ותרחישי מענה נפוצים עבור מתנדבי הקו החם.</p>

    <div class="samples-list">
      <div *ngFor="let call of sampleCalls" class="sample-call-card">
        <h4>{{ call.title }}</h4>
        <p class="sample-call-desc">{{ call.description }}</p>
        <span class="placeholder-tag">⏳ מוכן למילוי תוכן...</span>
      </div>
    </div>
  </section>
  `
  ,
  styleUrls: ['./samples.component.css']
})
export class SamplesComponent {
  @Input() sampleCalls: any[] = [];
}

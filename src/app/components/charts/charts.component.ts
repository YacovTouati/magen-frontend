import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-charts',
    standalone: true,
    imports: [CommonModule],
    template: `
  <section class="section-card">
    <h3>📊 דוחות חודשיים וכלי ניהול מנהלי</h3>
    <p class="section-desc">גרפים ופילוחים סטטיסטיים של השיחות שהתקבלו במערכת.</p>
    <div style="background: #f8fafc; padding: 40px; text-align: center; border: 1px dashed #cbd5e1; border-radius: 6px; color: #64748b;">
      🔒 אזור מנהל מאובטח: כאן יוטמעו בהמשך הגרפים והסטטיסטיקות המחוברים ל-DB.
    </div>
  </section>
  `
    ,
    styleUrls: ['./charts.component.css']
})
export class ChartsComponent { }

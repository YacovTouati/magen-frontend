import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CalendarDay {
    dayNumber: number;
    dateString: string;
    volunteer: string;
    isToday: boolean;
}

@Component({
    selector: 'app-calendar',
    standalone: true,
    imports: [CommonModule],
    template: `
  <section class="section-card diary-card">
    <div class="calendar-header">
      <h3>📓 יומן עבודה חודשי - <span class="month-highlight">{{ currentMonthName }}</span></h3>
      <div class="view-toggle">
        <button type="button" (click)="toggleView('diary')" [class.active]="viewMode === 'diary'">יומן</button>
        <button type="button" (click)="toggleView('table')" [class.active]="viewMode === 'table'">טבלה</button>
      </div>
    </div>
    <p class="section-desc">רשומות יומיות של משמרות, נקודות מפתח ותזכורות עבודה.</p>

    <div *ngIf="viewMode === 'diary'" class="diary-list">
      <article *ngFor="let day of calendarDays; let i = index" class="diary-entry" [class.today-card]="day.isToday">
        <div class="entry-header">
          <div>
            <div class="entry-date">{{ day.dateString }}</div>
            <div class="entry-title">יום {{ day.dayNumber }}</div>
          </div>
          <button (click)="assign(i)" class="assign-btn">שיבוץ</button>
        </div>

        <div class="entry-content">
          <p class="entry-label">סטטוס משמרת:</p>
          <p class="entry-value" [class.vacant]="day.volunteer === 'חלון פנוי'">{{ day.volunteer }}</p>
          <p class="entry-note">הערה: תזכורת להודיע על זמינות שעתיים לפני תחילת המשמרת.</p>
        </div>
      </article>
    </div>

    <div *ngIf="viewMode === 'table'" class="table-wrap">
      <table class="diary-table">
        <thead>
          <tr>
            <th>יום</th>
            <th>תאריך</th>
            <th>סטטוס</th>
            <th>פעולה</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let day of calendarDays; let i = index" [class.today-row]="day.isToday">
            <td>יום {{ day.dayNumber }}</td>
            <td>{{ day.dateString }}</td>
            <td [class.vacant]="day.volunteer === 'חלון פנוי'">{{ day.volunteer }}</td>
            <td><button type="button" (click)="assign(i)" class="assign-btn small">שיבוץ</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  `
    ,
    styleUrls: ['./calendar.component.css']
})
export class CalendarComponent {
    @Input() calendarDays: CalendarDay[] = [];
    @Input() currentMonthName = '';
    @Output() assignVolunteer = new EventEmitter<number>();

    viewMode: 'diary' | 'table' = 'diary';

    toggleView(mode: 'diary' | 'table') {
        this.viewMode = mode;
    }

    assign(index: number) {
        this.assignVolunteer.emit(index);
    }
}

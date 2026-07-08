import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <section class="section-card">
    <h3>📝 דיווח וסיכום שיחת סיוע</h3>
    <p class="section-desc">מלא את פרטי הפונה דמוגרפית ופרטי השיחה. כל המידע עובר אימות קפדני ונשמר בצורה מאובטחת.</p>

    <form (ngSubmit)="onSubmit()" class="report-form">
      <div class="compact-row">
        <div class="form-group inline-group">
          <label>שם הפונה (חובה):</label>
          <input type="text" [(ngModel)]="callerName" name="callerName" required placeholder="ישראל ישראלי" (keypress)="onlyLetters($event)">
        </div>

        <div class="form-group inline-group">
          <label>טלפון (חובה):</label>
          <input type="tel" [(ngModel)]="phone" name="phone" required placeholder="0500000000" (keypress)="onlyNumbers($event)">
        </div>

        <div class="form-group inline-group">
          <label>אימייל:</label>
          <input type="email" [(ngModel)]="email" name="email" placeholder="example@mail.com">
        </div>
      </div>

      <div class="form-group">
        <label>אזור בארץ:</label>
        <select [(ngModel)]="region" name="region">
          <option value="center">מרכז</option>
          <option value="north">צפון</option>
          <option value="south">דרום</option>
          <option value="jerusalem">ירושלים והסביבה</option>
          <option value="haifa">חיפה והסביבה</option>
          <option value="judea_samaria">יהודה ושומרון</option>
        </select>
      </div>

      <div class="form-grid secondary-grid">
        <div class="form-group">
          <label>סוג הפונה:</label>
          <select [(ngModel)]="callerType" name="callerType">
            <option value="victim">נפגע/ת ישיר/ה</option>
            <option value="family">בן/בת משפחה</option>
            <option value="friend">חבר/ה או מכר/ה</option>
          </select>
        </div>

        <div class="form-group">
          <label>מטרת השיחה המרכזית:</label>
          <select [(ngModel)]="callPurpose" name="callPurpose">
            <option value="counseling">ייעוץ ותמיכה רגשית</option>
            <option value="crisis">מצב משבר קריטי</option>
            <option value="coercion">דיווח על כפייה או פגיעה</option>
          </select>
        </div>

        <div class="form-group">
          <label>משך זמן השיחה (בדקות):</label>
          <input type="number" [(ngModel)]="callDuration" name="callDuration" min="1" max="480">
        </div>
      </div>

      <div class="form-group">
        <label>האם הפונה פנה בעבר למרכז סיוע אחר?</label>
        <select [(ngModel)]="contactedOtherCenterBefore" name="contactedOtherCenterBefore">
          <option [ngValue]="false">לא</option>
          <option [ngValue]="true">כן</option>
        </select>
      </div>

      <div class="form-group full-width">
        <label>תוכן וסיכום השיחה (דגשים חשובים, תהליך ומצב נוכחי):</label>
        <textarea [(ngModel)]="summaryNotes" name="summaryNotes" rows="5" required placeholder="הקלד כאן נקודות מפתח מתוך השיחה..."></textarea>
      </div>

      <button type="submit" class="submit-btn">💾 שמור דיווח שיחה במערכת</button>
    </form>
  </section>
  `
  ,
  styleUrls: ['./report.component.css']
})
export class ReportComponent {
  @Input() callDuration = 30;
  @Input() callerType = 'victim';
  @Input() callPurpose = 'counseling';
  @Input() summaryNotes = '';
  @Input() callerName = '';
  @Input() phone = '';
  @Input() email = '';
  @Input() region = 'center';
  @Input() gender = 'unknown';
  @Input() sector = 'secular';
  @Input() contactedOtherCenterBefore = false;

  @Output() reportSubmit = new EventEmitter<any>();

  onSubmit() {
    const data = {
      callDuration: this.callDuration,
      callerType: this.callerType,
      callPurpose: this.callPurpose,
      summaryNotes: this.summaryNotes,
      callerName: this.callerName,
      phone: this.phone,
      email: this.email,
      region: this.region,
      gender: this.gender,
      sector: this.sector,
      contactedOtherCenterBefore: this.contactedOtherCenterBefore
    };
    this.reportSubmit.emit(data);
  }

  onlyLetters(event: KeyboardEvent) {
    const charCode = event.key;
    const pattern = /^[a-zA-Zא-ת\s]$/;
    if (!pattern.test(charCode)) {
      event.preventDefault();
    }
  }

  onlyNumbers(event: KeyboardEvent) {
    const charCode = event.key;
    const pattern = /^[0-9\-]$/;
    if (!pattern.test(charCode)) {
      event.preventDefault();
    }
  }
}

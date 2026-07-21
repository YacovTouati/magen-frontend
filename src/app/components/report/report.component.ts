import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <section class="section-card">
    <h3>📝 דיווח וסיכום שיחת סיוע</h3>
    <p class="section-desc">מלא את פרטי הפונה דמוגרפית ופרטי השיחה. כל המידע עובר אימות קפדני ונשמר בצורה מאובטחת.</p>

    <form #reportForm="ngForm" (ngSubmit)="onSubmit()" class="report-form" novalidate>
      <div class="compact-row">
        <div class="form-group inline-group">
          <label>שם הפונה (חובה):</label>
          <input type="text" [(ngModel)]="callerName" name="callerName" required placeholder="ישראל ישראלי" (keypress)="onlyLetters($event)">
        </div>

        <div class="form-group inline-group">
          <label>טלפון (חובה):</label>
          <input
            type="tel"
            [(ngModel)]="phone"
            #phoneModel="ngModel"
            name="phone"
            required
            maxlength="10"
            pattern="^[0-9]{7,10}$"
            placeholder="0500000000"
            (keypress)="onlyNumbers($event)"
          >
          <p class="field-error" *ngIf="phoneModel.invalid && (phoneModel.dirty || phoneModel.touched)">
            מספר הטלפון חייב להכיל בין 7 ל-10 ספרות בלבד
          </p>
        </div>

        <div class="form-group inline-group">
          <label>אימייל:</label>
          <input type="email" [(ngModel)]="email" name="email" placeholder="example@mail.com">
        </div>
      </div>

      <div class="form-group">
        <label>אזור בארץ:</label>
        <input type="text" [(ngModel)]="region" name="region" required placeholder="לדוגמה: תל אביב, מרכז, ירושלים והסביבה">
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

      <div class="compact-row-quad">
        <div class="form-group inline-group">
          <label>האם קיבל ליווי במרכז סיוע אחר?</label>
          <select [(ngModel)]="receivedSupportAtOtherCenter" name="receivedSupportAtOtherCenter">
            <option [ngValue]="false">לא</option>
            <option [ngValue]="true">כן</option>
          </select>
        </div>

        <div class="form-group inline-group">
          <label>האם מכר או בן משפחה של נפגע?</label>
          <select [(ngModel)]="isFamilyMemberOrAcquaintance" name="isFamilyMemberOrAcquaintance">
            <option [ngValue]="false">לא</option>
            <option [ngValue]="true">כן</option>
          </select>
        </div>

        <div class="form-group inline-group">
          <label>האם פנה למגן בעבר?</label>
          <select [(ngModel)]="magenContactHistory" name="magenContactHistory">
            <option value="first_time">פעם ראשונה</option>
            <option value="past">פנה בעבר</option>
            <option value="dont_remember">לא זוכר</option>
          </select>
        </div>

        <div class="form-group inline-group">
          <label>האם יש חובת דיווח?</label>
          <select [(ngModel)]="reportingDuty" name="reportingDuty">
            <option [ngValue]="false">לא</option>
            <option [ngValue]="true">כן</option>
          </select>
        </div>
      </div>

      <div class="form-group full-width">
        <label>תוכן וסיכום השיחה (דגשים חשובים, תהליך ומצב נוכחי):</label>
        <textarea [(ngModel)]="summaryNotes" name="summaryNotes" rows="5" required placeholder="הקלד כאן נקודות מפתח מתוך השיחה..."></textarea>
      </div>

      <button type="submit" class="submit-btn" [disabled]="reportForm.invalid">💾 שמור דיווח שיחה במערכת</button>
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
  @Input() region = '';
  @Input() gender = 'unknown';
  @Input() sector = 'secular';
  @Input() receivedSupportAtOtherCenter = false;
  @Input() isFamilyMemberOrAcquaintance = false;
  @Input() magenContactHistory = 'first_time';
  @Input() reportingDuty = false;

  @Output() reportSubmit = new EventEmitter<any>();

  // Every field here is an @Input bound one-way from DashboardComponent, but [(ngModel)]
  // mutates this component's own copy directly — so once the user types, this instance's
  // fields diverge from the parent's and never sync back. Resetting the parent's mirrored
  // fields alone is a no-op (see DashboardComponent.onReportSubmit): the parent's value never
  // actually changes, so Angular's binding-diff skips re-pushing it down. The only reliable
  // reset is through the NgForm itself, which is why the parent calls resetForm() on success
  // rather than just clearing its own copies (still done too, for when this component is
  // recreated fresh after a tab switch).
  @ViewChild('reportForm') private ngForm!: NgForm;

  private readonly phonePattern = /^[0-9]{7,10}$/;

  resetForm(): void {
    this.ngForm.resetForm({
      callDuration: 30,
      callerType: 'victim',
      callPurpose: 'counseling',
      summaryNotes: '',
      callerName: '',
      phone: '',
      email: '',
      region: '',
      receivedSupportAtOtherCenter: false,
      isFamilyMemberOrAcquaintance: false,
      magenContactHistory: 'first_time',
      reportingDuty: false
    });
  }

  onSubmit() {
    if (!this.phonePattern.test(this.phone)) {
      return;
    }

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
      receivedSupportAtOtherCenter: this.receivedSupportAtOtherCenter,
      isFamilyMemberOrAcquaintance: this.isFamilyMemberOrAcquaintance,
      magenContactHistory: this.magenContactHistory,
      reportingDuty: this.reportingDuty
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
    const pattern = /^[0-9]$/;
    if (!pattern.test(charCode)) {
      event.preventDefault();
    }
  }
}

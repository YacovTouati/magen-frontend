import { AfterViewInit, Component, DestroyRef, EventEmitter, Input, OnInit, Output, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { AuthService } from '../../services/auth.service';

const DRAFT_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

interface ReportDraft {
  savedAt: number;
  data: Record<string, unknown>;
}

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent],
  template: `
  <section class="section-card">
    <h3>📝 דיווח וסיכום שיחת סיוע</h3>
    <p class="section-desc">מלא את פרטי הפונה דמוגרפית ופרטי השיחה. כל המידע עובר אימות קפדני ונשמר בצורה מאובטחת.</p>

    <p class="draft-restored-hint" *ngIf="draftRestored">📝 טיוטה שוחזרה</p>

    <form #reportForm="ngForm" (ngSubmit)="onSubmit()" class="report-form" novalidate>
      <div class="compact-row">
        <div class="form-group inline-group">
          <label>שם הפונה (חובה):</label>
          <input type="text" [(ngModel)]="callerName" name="callerName" required placeholder="ישראל ישראלי" (keypress)="onlyLetters($event)">
        </div>

        <div class="form-group inline-group">
          <label>טלפון:</label>
          <input
            type="tel"
            [(ngModel)]="phone"
            #phoneModel="ngModel"
            name="phone"
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
            <option value="unknown">אנונימי</option>
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
            <option value="no">לא</option>
            <option value="yes">כן</option>
            <option value="unknown">לא ידוע</option>
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
            <option value="no">לא</option>
            <option value="yes_practical">כן מעשי</option>
            <option value="yes_principled">כן עקרוני</option>
          </select>
        </div>
      </div>

      <div class="form-group full-width">
        <label>תוכן וסיכום השיחה (דגשים חשובים, תהליך ומצב נוכחי):</label>
        <textarea [(ngModel)]="summaryNotes" name="summaryNotes" rows="5" required placeholder="הקלד כאן נקודות מפתח מתוך השיחה..."></textarea>
      </div>

      <div class="form-group">
        <label>מי הכניס את הדיווח (חובה):</label>
        <input
          type="text"
          [(ngModel)]="reportedBy"
          #reportedByModel="ngModel"
          name="reportedBy"
          required
          placeholder="שם המתנדב/ת המדווח/ת"
        >
        <p class="field-error" *ngIf="reportedByModel.invalid && (reportedByModel.dirty || reportedByModel.touched)">
          חובה להזין את שם מכניס/ת הדיווח
        </p>
      </div>

      <button type="submit" class="submit-btn" [disabled]="reportForm.invalid">💾 שמור דיווח שיחה במערכת</button>
    </form>
  </section>

  <app-confirm-modal
    [isOpen]="isEmptyPhoneConfirmOpen"
    title="שמירה ללא מספר טלפון"
    message="האם ברצונך לשמור שיחה ללא מספר טלפון של הפונה?"
    confirmLabel="אישור"
    cancelLabel="ביטול"
    (confirmed)="onConfirmEmptyPhoneSubmit()"
    (cancelled)="onCancelEmptyPhoneSubmit()"
  ></app-confirm-modal>
  `
  ,
  styleUrls: ['./report.component.css']
})
export class ReportComponent implements OnInit, AfterViewInit {
  @Input() callDuration = 30;
  @Input() callerType = 'victim';
  @Input() callPurpose = 'counseling';
  @Input() summaryNotes = '';
  @Input() callerName = '';
  @Input() phone = '';
  @Input() email = '';
  @Input() reportedBy = '';
  @Input() region = '';
  @Input() gender = 'unknown';
  @Input() sector = 'secular';
  @Input() receivedSupportAtOtherCenter = 'no';
  @Input() isFamilyMemberOrAcquaintance = false;
  @Input() magenContactHistory = 'first_time';
  @Input() reportingDuty = 'no';

  @Output() reportSubmit = new EventEmitter<any>();

  isEmptyPhoneConfirmOpen = false;

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

  draftRestored = false;
  private draftRestoredTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // Scoped per-user (not a flat key) — this form runs on shared call-center stations
  // where different volunteers log in/out on the same browser, and a stray draft
  // leaking into the wrong person's session would be worse than losing it outright.
  private get draftStorageKey(): string {
    const email = this.authService.getUser()?.email ?? 'anonymous';
    return `magen_report_draft_${email}`;
  }

  ngOnInit(): void {
    this.restoreDraftIfFresh();
  }

  private formSub: Subscription | null = null;

  // ngForm (from @ViewChild) only resolves after the view is initialized — its
  // form.valueChanges observable isn't available any earlier than this.
  ngAfterViewInit(): void {
    this.subscribeToFormChanges();
  }

  private subscribeToFormChanges(): void {
    // Not ready yet if called from ngOnInit's restoreDraftIfFresh() (e.g. purging an
    // expired/corrupt draft) — ngForm only resolves once ngAfterViewInit runs, which
    // will set up the real subscription itself right after. Nothing pending to discard
    // this early anyway.
    if (!this.ngForm) {
      return;
    }

    this.formSub?.unsubscribe();
    this.formSub = this.ngForm.form.valueChanges.pipe(
      debounceTime(400),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.saveDraft());
  }

  private saveDraft(): void {
    const draft: ReportDraft = {
      savedAt: Date.now(),
      data: this.ngForm.form.value
    };

    try {
      localStorage.setItem(this.draftStorageKey, JSON.stringify(draft));
    } catch {
      // localStorage can throw (private browsing, quota exceeded) — a draft is a
      // nice-to-have, never worth failing the form over.
    }
  }

  private restoreDraftIfFresh(): void {
    let raw: string | null;
    try {
      raw = localStorage.getItem(this.draftStorageKey);
    } catch {
      return;
    }

    if (!raw) {
      return;
    }

    let draft: ReportDraft;
    try {
      draft = JSON.parse(raw);
    } catch {
      this.clearDraft();
      return;
    }

    if (!draft?.savedAt || Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
      this.clearDraft();
      return;
    }

    Object.entries(draft.data ?? {}).forEach(([key, value]) => {
      if (key in this) {
        (this as any)[key] = value;
      }
    });

    this.showDraftRestoredToast();
  }

  // Called by the parent (DashboardComponent) alongside resetForm() once a submission
  // has actually been confirmed saved server-side — never on a bare click of "save",
  // which is exactly the case a failed/offline submission still needs the draft for.
  clearDraft(): void {
    // resetForm() (called just before this) changes the form's value too, which would
    // otherwise still be sitting in the debounce buffer — left alone, that pending save
    // fires ~400ms later and silently rewrites a blank draft right after we clear it.
    // Restarting the subscription discards debounceTime's in-flight timer along with it.
    this.subscribeToFormChanges();

    try {
      localStorage.removeItem(this.draftStorageKey);
    } catch {
      // ignore — nothing to clean up if storage isn't available
    }
  }

  // "Brief toast" — same self-clearing convention as IntakeAlertsComponent's
  // showSuccessToast, so it doesn't require a dismiss click.
  private showDraftRestoredToast(): void {
    if (this.draftRestoredTimeoutId !== null) {
      clearTimeout(this.draftRestoredTimeoutId);
    }
    this.draftRestored = true;
    this.draftRestoredTimeoutId = setTimeout(() => {
      this.draftRestored = false;
      this.draftRestoredTimeoutId = null;
    }, 3000);
  }

  resetForm(): void {
    this.ngForm.resetForm({
      callDuration: 30,
      callerType: 'victim',
      callPurpose: 'counseling',
      summaryNotes: '',
      callerName: '',
      phone: '',
      email: '',
      reportedBy: '',
      region: '',
      receivedSupportAtOtherCenter: 'no',
      isFamilyMemberOrAcquaintance: false,
      magenContactHistory: 'first_time',
      reportingDuty: 'no'
    });
  }

  onSubmit() {
    const trimmedPhone = this.phone.trim();

    if (trimmedPhone && !this.phonePattern.test(trimmedPhone)) {
      return;
    }

    if (!trimmedPhone) {
      this.isEmptyPhoneConfirmOpen = true;
      return;
    }

    this.submitReport();
  }

  onConfirmEmptyPhoneSubmit(): void {
    this.isEmptyPhoneConfirmOpen = false;
    this.submitReport();
  }

  onCancelEmptyPhoneSubmit(): void {
    this.isEmptyPhoneConfirmOpen = false;
  }

  private submitReport(): void {
    const data = {
      callDuration: this.callDuration,
      callerType: this.callerType,
      callPurpose: this.callPurpose,
      summaryNotes: this.summaryNotes,
      callerName: this.callerName,
      phone: this.phone,
      email: this.email,
      reportedBy: this.reportedBy,
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

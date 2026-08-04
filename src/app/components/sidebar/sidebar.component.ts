import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, NgZone, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IntakeService } from '../../services/intake.service';

const UNHANDLED_COUNT_POLL_INTERVAL_MS = 15000;

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="mobile-backdrop" *ngIf="mobileOpen" (click)="requestClose()"></div>
  <aside class="sidebar" [class.mobile-open]="mobileOpen">
    <div class="logo-area">
      <img src="assets/magen-logo.png" alt="מגן לוגו" class="magen-logo">
      <span class="role-badge" [ngClass]="roleBadgeClass">{{ roleBadgeLabel }}</span>
    </div>

    <nav class="nav-tabs">
      <button class="nav-btn" [class.active]="currentTab === 'calendar'" routerLink="/shifts" (click)="requestClose()">📅 לוח שנה חודשי</button>
      <button
        *ngIf="isSuperAdmin || isIntakeAdmin"
        class="nav-btn intakes-nav-btn"
        [class.active]="currentTab === 'intakes'"
        routerLink="/intakes"
        (click)="requestClose()"
      >
        📥 אינטייקים
        <span class="nav-badge" *ngIf="unhandledIntakeCount > 0">{{ unhandledIntakeCount }}</span>
      </button>
      <button class="nav-btn" [class.active]="currentTab === 'report'" (click)="switch('report')">📝 דיווח שיחה חדשה</button>
      <button *ngIf="isAdmin" class="nav-btn" [class.active]="currentTab === 'charts'" (click)="switch('charts')">📊 דוחות ואנליטיקה</button>
      <button *ngIf="isSuperAdmin" class="nav-btn" [class.active]="currentTab === 'samples'" (click)="switch('samples')">📚 שיחות ותרחישים לדוגמה</button>
      <button *ngIf="isSuperAdmin" class="nav-btn" [class.active]="currentTab === 'users'" (click)="switch('users')">👤 ניהול משתמשים</button>
    </nav>

    <div class="quote-card">
      <p class="quote-text">{{ currentQuote }}</p>
    </div>

    <div class="user-info">
      <p style="font-size: 12px; margin-bottom: 10px; color: #cbd5e1;">מחובר: <strong>{{ currentUserEmail }}</strong></p>
      <button (click)="logout()" class="btn btn-logout">התנתק</button>
    </div>
  </aside>
  `
  ,
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent implements OnInit {
  @Input() currentUserEmail = '';
  @Input() currentQuote = '';
  @Input() currentTab = 'calendar';
  @Input() isAdmin = false;
  @Input() isSuperAdmin = false;
  @Input() isIntakeAdmin = false;
  @Input() isSchedulerAdmin = false;
  @Input() mobileOpen = false;
  @Output() tabChange = new EventEmitter<string>();
  @Output() logoutEvent = new EventEmitter<void>();
  @Output() closeMobile = new EventEmitter<void>();

  unhandledIntakeCount = 0;

  private intakeService = inject(IntakeService);
  private destroyRef = inject(DestroyRef);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    // Same permission as the tab itself (canManageIntakes on the backend) — no point
    // polling a count for a role that can't see the tab it decorates anyway.
    if (!this.isSuperAdmin && !this.isIntakeAdmin) {
      return;
    }

    // Scheduled outside NgZone so the recurring timer never counts as a pending zone
    // macrotask (would otherwise stall e.g. ApplicationRef.isStable / fixture.whenStable(),
    // same pitfall already hit and fixed in IntakeAlertsComponent/ShiftBoardComponent this
    // session) — re-enters the zone only to apply the result. This component is OnPush, so
    // markForCheck() is required too; a plain field assignment alone would silently never
    // re-render since the update never originates from this component's own template event.
    this.ngZone.runOutsideAngular(() => {
      timer(0, UNHANDLED_COUNT_POLL_INTERVAL_MS).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        this.ngZone.run(() => this.loadUnhandledCount());
      });
    });
  }

  private loadUnhandledCount(): void {
    this.intakeService.getUnhandledCount().subscribe({
      next: (count) => {
        this.unhandledIntakeCount = count;
        this.cdr.markForCheck();
      },
      error: () => {
        // Silent — the badge just keeps showing its last known value rather than
        // flashing an error state over a purely decorative notification count.
      }
    });
  }

  get roleBadgeLabel(): string {
    if (this.isSuperAdmin) {
      return 'ממשק מנהל ראשי';
    }
    if (this.isIntakeAdmin) {
      return 'ממשק מנהל אינטייק';
    }
    if (this.isSchedulerAdmin) {
      return 'ממשק מנהל שיבוצים';
    }
    return 'ממשק מתנדב';
  }

  get roleBadgeClass(): string {
    if (this.isSuperAdmin) {
      return 'role-super-admin';
    }
    if (this.isIntakeAdmin) {
      return 'role-intake-admin';
    }
    if (this.isSchedulerAdmin) {
      return 'role-scheduler-admin';
    }
    return 'role-volunteer';
  }

  switch(tab: string) {
    this.tabChange.emit(tab);
    this.requestClose();
  }

  requestClose() {
    this.closeMobile.emit();
  }

  logout() {
    this.logoutEvent.emit();
  }
}

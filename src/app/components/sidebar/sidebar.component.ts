import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <aside class="sidebar">
    <div class="logo-area">
      <img src="assets/magen-logo.png" alt="מגן לוגו" class="magen-logo">
      <span class="role-badge" [ngClass]="roleBadgeClass">{{ roleBadgeLabel }}</span>
    </div>

    <nav class="nav-tabs">
      <button class="nav-btn" [class.active]="currentTab === 'calendar'" routerLink="/shifts">📅 לוח שנה חודשי</button>
      <button class="nav-btn" [class.active]="currentTab === 'report'" (click)="switch('report')">📝 דיווח שיחה חדשה</button>
      <button *ngIf="isAdmin" class="nav-btn" [class.active]="currentTab === 'charts'" (click)="switch('charts')">📊 דוחות ואנליטיקה</button>
      <button *ngIf="!isIntakeAdmin && !isSchedulerAdmin" class="nav-btn" [class.active]="currentTab === 'samples'" (click)="switch('samples')">📚 שיחות ותרחישים לדוגמה</button>
      <button *ngIf="isSuperAdmin" class="nav-btn" [class.active]="currentTab === 'users'" (click)="switch('users')">👤 ניהול משתמשים</button>
      <button class="nav-btn" [class.active]="currentTab === 'future'" (click)="switch('future')">⚙️ הגדרות עתידיות...</button>
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
export class SidebarComponent {
  @Input() currentUserEmail = '';
  @Input() currentQuote = '';
  @Input() currentTab = 'calendar';
  @Input() isAdmin = false;
  @Input() isSuperAdmin = false;
  @Input() isIntakeAdmin = false;
  @Input() isSchedulerAdmin = false;
  @Output() tabChange = new EventEmitter<string>();
  @Output() logoutEvent = new EventEmitter<void>();

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
  }

  logout() {
    this.logoutEvent.emit();
  }
}

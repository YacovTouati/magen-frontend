import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { SamplesComponent } from '../samples/samples.component';
import { ReportComponent } from '../report/report.component';
import { ChartsComponent } from '../charts/charts.component';
import { FutureComponent } from '../future/future.component';
import { SuccessModalComponent } from '../success-modal/success-modal.component';
import { IntakeAlertsComponent } from '../intake-alerts/intake-alerts.component';
import { AuthService } from '../../services/auth.service';
import { ReportService, CallReportPayload } from '../../services/report.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, SamplesComponent, ReportComponent, ChartsComponent, FutureComponent, SuccessModalComponent, IntakeAlertsComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private reportService = inject(ReportService);
  private destroyRef = inject(DestroyRef);

  currentUserEmail = '';
  isAdmin = false;
  isSuperAdmin = false;
  isIntakeAdmin = false;
  isSchedulerAdmin = false;
  currentTab = 'report';

  private readonly legacyTabs = ['report', 'charts', 'samples', 'future'];

  currentRoute = '/';

  empowermentQuotes = [
    "« כל המציל נפש אחת... כאילו קיים עולם מלא »",
    "« המקשיב מקשיב גם לעצמו. תודה על הלב הפתוח שלך היום »",
    "« יש שקונה עולמו בשעה אחת – השעה הזו שהענקת, שינתה חיים »"
  ];
  currentQuote = this.empowermentQuotes[0];

  // רשימת שיחות לדוגמה מוכנה
  sampleCalls = [
    { id: 1, title: 'תרחיש 1: שיחת משבר ראשוני', description: 'מקום לתיאור מקרה, נקודות מפתח למענה ומבנה השיחה... (נמלא בהמשך)' },
    { id: 2, title: 'תרחיש 2: פנייה של בן משפחה המודאג ממצב קרובו', description: 'מקום לתיאור מקרה, דגשים להקשבה תומכת... (נמלא בהמשך)' },
    { id: 3, title: 'תרחיש 3: שיחת מעקב או ליווי אקטיבי', description: 'מקום לתיאור מקרה, פרוטוקול ליווי והפניה לגורמים רלוונטיים... (נמלא בהמשך)' }
  ];

  // שדות טופס דיווח שיחה מורחב
  callDuration: number = 30;
  callerType: string = 'victim';
  callPurpose: string = 'counseling';
  summaryNotes: string = '';
  callerName: string = '';
  phone: string = '';
  email: string = '';
  region: string = '';
  gender: string = 'unknown';
  sector: string = 'secular';
  receivedSupportAtOtherCenter: boolean = false;
  isFamilyMemberOrAcquaintance: boolean = false;
  magenContactHistory: string = 'first_time';
  reportingDuty: boolean = false;

  isSuccessModalOpen = false;
  successModalMessage = '';

  ngOnInit() {
    const user = this.authService.getUser();
    this.currentUserEmail = user?.email ?? '';
    this.isAdmin = this.authService.isAdmin();
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.isIntakeAdmin = this.authService.isIntakeAdmin();
    this.isSchedulerAdmin = this.authService.isSchedulerAdmin();

    const randomIndex = Math.floor(Math.random() * this.empowermentQuotes.length);
    this.currentQuote = this.empowermentQuotes[randomIndex];

    this.currentRoute = this.router.url;
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((event: any) => {
      this.currentRoute = event.urlAfterRedirects || event.url;
      this.updateCurrentTabFromRoute();
    });

    this.updateCurrentTabFromRoute();
  }

  private updateCurrentTabFromRoute(): void {
    if (this.currentRoute === '/admin/users') {
      this.currentTab = 'users';
      return;
    }

    // /shifts IS the calendar tab now (ShiftBoardComponent) — no separate 'shifts' tab exists.
    if (this.currentRoute === '/shifts') {
      this.currentTab = 'calendar';
      return;
    }

    // '/' is the legacy tab area (report/charts/samples/future toggle purely via currentTab,
    // with no route of their own — switchTab() always navigates back to '/' for them, which
    // Router ignores as a no-op since we're already there, so this branch only runs when we
    // actually arrive at '/' from /admin/users or /shifts). Default to the call report form
    // unless a legacy tab is already active.
    if (!this.legacyTabs.includes(this.currentTab)) {
      this.currentTab = 'report';
    }
  }

  isAdminUsersRoute(): boolean {
    return this.currentRoute === '/admin/users';
  }

  isShiftsRoute(): boolean {
    return this.currentRoute === '/shifts';
  }

  switchTab(tabName: string) {
    this.currentTab = tabName;

    if (tabName === 'users') {
      this.router.navigate(['/admin/users']);
    } else if (tabName === 'calendar') {
      this.router.navigate(['/shifts']);
    } else {
      this.router.navigate(['/']);
    }
  }

  onReportSubmit(reportData: CallReportPayload) {
    this.reportService.submitReport(reportData).subscribe({
      next: (result) => {
        this.successModalMessage = `הדיווח נשמר בהצלחה בשרת! מספר מזהה ייחודי: ${result.id ?? 'N/A'}`;
        this.isSuccessModalOpen = true;

        // איפוס שדות מינימלי
        this.summaryNotes = '';
        this.callerName = '';
        this.phone = '';
        this.email = '';
        this.region = '';
        this.receivedSupportAtOtherCenter = false;
        this.isFamilyMemberOrAcquaintance = false;
        this.magenContactHistory = 'first_time';
        this.reportingDuty = false;
      },
      error: () => {
        alert('שגיאה בשמירת הדיווח. הנתונים נחסמו מטעמי אבטחה או אימות.');
      }
    });
  }

  closeSuccessModal(): void {
    this.isSuccessModalOpen = false;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

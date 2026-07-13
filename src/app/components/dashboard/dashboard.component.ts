import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CalendarComponent, CalendarDay, ShiftAssignment, MonthSelection, VACANT_LABEL } from '../calendar/calendar.component';
import { SamplesComponent } from '../samples/samples.component';
import { ReportComponent } from '../report/report.component';
import { ChartsComponent } from '../charts/charts.component';
import { FutureComponent } from '../future/future.component';
import { AuthService } from '../../services/auth.service';
import { ReportService, CallReportPayload } from '../../services/report.service';
import { AssignmentService, ShiftAssignmentRecord } from '../../services/assignment.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, CalendarComponent, SamplesComponent, ReportComponent, ChartsComponent, FutureComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private reportService = inject(ReportService);
  private assignmentService = inject(AssignmentService);
  private destroyRef = inject(DestroyRef);

  currentUserEmail = '';
  isAdmin = false;
  currentTab = 'calendar';

  calendarDays: CalendarDay[] = [];
  isLoadingCalendar = false;
  calendarError = '';
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth();
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
  region: string = 'center';
  gender: string = 'unknown';
  sector: string = 'secular';
  contactedOtherCenterBefore: boolean = false;
  reportingDuty: boolean = false;

  ngOnInit() {
    this.loadCalendarForMonth(this.selectedYear, this.selectedMonth);

    const user = this.authService.getUser();
    this.currentUserEmail = user?.email ?? '';
    this.isAdmin = this.authService.isAdmin();

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

  loadCalendarForMonth(year: number, month: number) {
    const scaffold = this.buildMonthScaffold(year, month);
    this.calendarDays = scaffold;
    this.isLoadingCalendar = true;
    this.calendarError = '';

    const daysInMonth = scaffold.length;
    const from = this.toIsoDate(year, month, 1);
    const to = this.toIsoDate(year, month, daysInMonth);

    this.assignmentService.getAssignments(from, to).subscribe({
      next: (records) => {
        this.calendarDays = this.mergeAssignments(scaffold, records, year, month);
        this.isLoadingCalendar = false;
      },
      error: () => {
        this.calendarDays = scaffold;
        this.isLoadingCalendar = false;
        this.calendarError = 'לא ניתן לטעון את יומן המשמרות מהשרת כרגע.';
      }
    });
  }

  private buildMonthScaffold(year: number, month: number): CalendarDay[] {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date();

    const generatedDays: CalendarDay[] = [];

    for (let i = 1; i <= daysInMonth; i++) {
      // isToday always compares against the real world date, regardless of which month is being browsed
      const isToday = year === now.getFullYear() && month === now.getMonth() && i === now.getDate();

      generatedDays.push({
        dayNumber: i,
        dateString: `${i}/${month + 1}/${year}`,
        volunteer: VACANT_LABEL,
        isToday
      });
    }

    return generatedDays;
  }

  private mergeAssignments(days: CalendarDay[], records: ShiftAssignmentRecord[], year: number, month: number): CalendarDay[] {
    const byDate = new Map(records.map(record => [record.date, record.volunteer?.name || VACANT_LABEL]));

    return days.map(day => {
      const volunteerName = byDate.get(this.toIsoDate(year, month, day.dayNumber));
      return volunteerName ? { ...day, volunteer: volunteerName } : day;
    });
  }

  private toIsoDate(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  onMonthChange(selection: MonthSelection) {
    this.selectedYear = selection.year;
    this.selectedMonth = selection.month;
    this.loadCalendarForMonth(selection.year, selection.month);
  }

  private updateCurrentTabFromRoute(): void {
    if (this.currentRoute === '/admin/users') {
      this.currentTab = 'users';
      return;
    }

    this.currentTab = 'calendar';
  }

  isAdminUsersRoute(): boolean {
    return this.currentRoute === '/admin/users';
  }

  switchTab(tabName: string) {
    this.currentTab = tabName;

    if (tabName === 'users') {
      this.router.navigate(['/admin/users']);
    } else {
      this.router.navigate(['/']);
    }
  }

  // CalendarComponent already persisted this assignment to the server (POST /api/assignments)
  // before emitting — this just syncs the locally-held day array to that confirmed result.
  onAssignVolunteer(assignment: ShiftAssignment) {
    this.calendarDays = this.calendarDays.map((day, index) =>
      index === assignment.dayIndex ? { ...day, volunteer: assignment.volunteerName } : day
    );
  }

  // CalendarComponent already persisted the removal to the server (DELETE /api/assignments/:date)
  // before emitting — this just syncs the locally-held day array to that confirmed result.
  onUnassignVolunteer(dayIndex: number) {
    this.calendarDays = this.calendarDays.map((day, index) =>
      index === dayIndex ? { ...day, volunteer: VACANT_LABEL } : day
    );
  }

  onReportSubmit(reportData: CallReportPayload) {
    this.reportService.submitReport(reportData).subscribe({
      next: (result) => {
        alert(`הדיווח נשמר בהצלחה בשרת! מספר מזהה ייחודי: ${result.id ?? 'N/A'}`);

        // איפוס שדות מינימלי
        this.summaryNotes = '';
        this.callerName = '';
        this.phone = '';
        this.email = '';
        this.contactedOtherCenterBefore = false;
        this.reportingDuty = false;
      },
      error: () => {
        alert('שגיאה בשמירת הדיווח. הנתונים נחסמו מטעמי אבטחה או אימות.');
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

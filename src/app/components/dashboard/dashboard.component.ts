import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CalendarComponent, ShiftAssignment, MonthSelection } from '../calendar/calendar.component';
import { SamplesComponent } from '../samples/samples.component';
import { ReportComponent } from '../report/report.component';
import { ChartsComponent } from '../charts/charts.component';
import { FutureComponent } from '../future/future.component';
import { AuthService } from '../../services/auth.service';

interface CalendarDay {
  dayNumber: number;
  dateString: string;
  volunteer: string;
  isToday: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, CalendarComponent, SamplesComponent, ReportComponent, ChartsComponent, FutureComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);

  currentUserEmail = '';
  isAdmin = false;
  currentTab = 'calendar';

  calendarDays: CalendarDay[] = [];
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
    this.generateCalendarForMonth(this.selectedYear, this.selectedMonth);

    const user = this.authService.getUser();
    this.currentUserEmail = user?.email ?? '';
    this.isAdmin = this.authService.isAdmin();

    const randomIndex = Math.floor(Math.random() * this.empowermentQuotes.length);
    this.currentQuote = this.empowermentQuotes[randomIndex];

    this.currentRoute = this.router.url;
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe((event: any) => {
      this.currentRoute = event.urlAfterRedirects || event.url;
      this.updateCurrentTabFromRoute();
    });

    this.updateCurrentTabFromRoute();
  }

  generateCalendarForMonth(year: number, month: number) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date();

    const generatedDays: CalendarDay[] = [];

    for (let i = 1; i <= daysInMonth; i++) {
      // isToday always compares against the real world date, regardless of which month is being browsed
      const isToday = year === now.getFullYear() && month === now.getMonth() && i === now.getDate();

      generatedDays.push({
        dayNumber: i,
        dateString: `${i}/${month + 1}/${year}`,
        volunteer: i % 4 === 0 ? 'חלון פנוי' : (i % 3 === 0 ? 'שרה מ.' : 'רבקה ס.'),
        isToday
      });
    }
    this.calendarDays = generatedDays;
  }

  onMonthChange(selection: MonthSelection) {
    this.selectedYear = selection.year;
    this.selectedMonth = selection.month;
    this.generateCalendarForMonth(selection.year, selection.month);
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

  onTabChange(tab: string) {
    this.switchTab(tab);
  }

  onAssignVolunteer(assignment: ShiftAssignment) {
    this.calendarDays[assignment.dayIndex].volunteer = assignment.volunteerName;
  }

  onReportSubmit(reportData: any) {
    this.http.post('http://localhost:3000/api/reports', reportData)
      .subscribe({
        next: (response: any) => {
          console.log('📬 תשובה שהתקבלה מהבקאנד המאובטח:', response);
          alert(`הדיווח נשמר בהצלחה בשרת! מספר מזהה ייחודי: ${response.data?.id ?? 'N/A'}`);

          // איפוס שדות מינימלי
          this.summaryNotes = '';
          this.callerName = '';
          this.phone = '';
          this.email = '';
          this.contactedOtherCenterBefore = false;
          this.reportingDuty = false;
        },
        error: (err) => {
          console.error('❌ הבקאנד חסם את הבקשה או שיש שגיאת רשת:', err);
          alert('שגיאה בשמירת הדיווח. הנתונים נחסמו מטעמי אבטחה או אימות.');
        }
      });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

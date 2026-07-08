import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { inject } from '@angular/core'; // כלי מודרני להזרקת שירותים
import { LoginComponent } from './components/login/login.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { SamplesComponent } from './components/samples/samples.component';
import { ReportComponent } from './components/report/report.component';
import { ChartsComponent } from './components/charts/charts.component';
import { FutureComponent } from './components/future/future.component';

interface CalendarDay {
  dayNumber: number;
  dateString: string;
  volunteer: string;
  isToday: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, LoginComponent, SidebarComponent, CalendarComponent, SamplesComponent, ReportComponent, ChartsComponent, FutureComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private http = inject(HttpClient);

  isLoggedIn = false;
  isAdmin = false;
  currentUserEmail = '';
  loginEmail = '';
  currentTab = 'calendar';

  currentMonthName = '';
  calendarDays: CalendarDay[] = [];

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

  ngOnInit() {
    this.generateCurrentMonthCalendar();

    // 🔥 בדיקה אוטומטית: האם המשתמש כבר התחבר בעבר?
    const savedEmail = localStorage.getItem('magen_user_email');
    if (savedEmail) {
      this.loginEmail = savedEmail;
      this.loginUser(savedEmail);
    }
  }

  generateCurrentMonthCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthFormatter = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });
    this.currentMonthName = monthFormatter.format(now);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const generatedDays: CalendarDay[] = [];
    const todayDate = now.getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      generatedDays.push({
        dayNumber: i,
        dateString: `${i}/${month + 1}/${year}`,
        volunteer: i % 4 === 0 ? 'חלון פנוי' : (i % 3 === 0 ? 'שרה מ.' : 'רבקה ס.'),
        isToday: (i === todayDate)
      });
    }
    this.calendarDays = generatedDays;
  }

  // פונקציית העזר שמבצעת את הלוגין בפועל
  private loginUser(email: string) {
    this.currentUserEmail = email.toLowerCase();
    this.isLoggedIn = true;
    this.isAdmin = true; // אתה המנהל, נשאר קבוע

    const randomIndex = Math.floor(Math.random() * this.empowermentQuotes.length);
    this.currentQuote = this.empowermentQuotes[randomIndex];
  }

  handleLogin() {
    if (!this.loginEmail) return;

    // 🔥 שמירת המייל בזיכרון המקומי של הדפדפן
    localStorage.setItem('magen_user_email', this.loginEmail);

    this.loginUser(this.loginEmail);
  }

  onLogin(email: string) {
    if (!email) return;
    this.loginEmail = email;
    localStorage.setItem('magen_user_email', email);
    this.loginUser(email);
  }

  switchTab(tabName: string) {
    this.currentTab = tabName;
  }

  onTabChange(tab: string) {
    this.switchTab(tab);
  }

  assignVolunteer(dayIndex: number) {
    const name = prompt(`הכנס שם מתנדב לשיבוץ לתאריך ${this.calendarDays[dayIndex].dateString}:`);
    if (name) {
      this.calendarDays[dayIndex].volunteer = name;
    }
  }

  onAssignVolunteer(index: number) {
    this.assignVolunteer(index);
  }

  submitReport() {
    const reportData = {
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

    console.log('🚀 הפרונטנד שולח כעת בקשת HTTP אמיתית לבקאנד...');

    // 🔥 שליחת המידע לגשר ה-API בפורט 3000
    this.http.post('http://localhost:3000/api/reports', reportData)
      .subscribe({
        next: (response: any) => {
          // 🎉 הצלחה! השרת קיבל, אישר והחזיר תשובה
          console.log('📬 תשובה שהתקבלה מהבקאנד המאובטח:', response);
          alert(`הדיווח נשמר בהצלחה בשרת! מספר מזהה ייחודי: ${response.data.id}`);

          // איפוס הטופס רק לאחר שמירה מוצלחת
          this.summaryNotes = '';
          this.callerName = '';
          this.phone = '';
          this.email = '';
          this.contactedOtherCenterBefore = false;
        },
        error: (err) => {
          // ⛔ כישלון - השרת חסם את המידע (למשל, ה-Validator מצא שגיאה)
          console.error('❌ הבקאנד חסם את הבקשה או שיש שגיאת רשת:', err);
          alert('שגיאה בשמירת הדיווח. הנתונים נחסמו מטעמי אבטחה או אימות.');
        }
      });
  }

  onReportSubmit(reportData: any) {
    // reuse existing submitReport logic but with provided data
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
        },
        error: (err) => {
          console.error('❌ הבקאנד חסם את הבקשה או שיש שגיאת רשת:', err);
          alert('שגיאה בשמירת הדיווח. הנתונים נחסמו מטעמי אבטחה או אימות.');
        }
      });
  }

  logout() {
    // 🔥 מחיקת המייל מהזיכרון כדי שיוכל להתנתק באמת אם ירצה
    localStorage.removeItem('magen_user_email');

    this.isLoggedIn = false;
    this.isAdmin = false;
    this.loginEmail = '';
    this.currentTab = 'calendar';
  }

  onlyLetters(event: KeyboardEvent) {
    const charCode = event.key;
    const pattern = /^[a-zA-Zא-ת\s]$/;
    if (!pattern.test(charCode)) {
      event.preventDefault();
    }
  }

  // 🛡️ חסימת הקלדה: מאפשר רק מספרים ומקפים
  onlyNumbers(event: KeyboardEvent) {
    const charCode = event.key;
    const pattern = /^[0-9\-]$/;
    if (!pattern.test(charCode)) {
      event.preventDefault();
    }
  }
}
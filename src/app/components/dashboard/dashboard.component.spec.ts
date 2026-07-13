import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../services/auth.service';

describe('DashboardComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser', 'isAdmin', 'logout']);
        authServiceSpy.getUser.and.returnValue({ email: 'admin@magen.org', role: 'ADMIN' });
        authServiceSpy.isAdmin.and.returnValue(true);

        await TestBed.configureTestingModule({
            imports: [DashboardComponent, HttpClientTestingModule, RouterTestingModule],
            providers: [{ provide: AuthService, useValue: authServiceSpy }]
        }).compileComponents();
    });

    it('should create and load the current user from AuthService', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();

        expect(comp).toBeTruthy();
        expect(comp.currentUserEmail).toBe('admin@magen.org');
        expect(comp.isAdmin).toBeTrue();
    });

    it('should default to the calendar tab for a non-admin route', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();

        expect(comp.currentTab).toBe('calendar');
        expect(comp.isAdminUsersRoute()).toBeFalse();
    });

    it('onAssignVolunteer should apply the ShiftAssignment payload to the matching calendar day', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();
        const originalDays = comp.calendarDays;

        comp.onAssignVolunteer({ dayIndex: 3, volunteerName: 'דנה כ.' });

        // onAssignVolunteer replaces the array immutably (new references) so OnPush-strategy
        // children fed [calendarDays] as an @Input reliably detect the change.
        expect(comp.calendarDays).not.toBe(originalDays);
        expect(comp.calendarDays[3].volunteer).toBe('דנה כ.');
    });

    it('onMonthChange should regenerate calendarDays for the newly selected month/year', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();

        comp.onMonthChange({ year: 2027, month: 0 }); // January 2027

        expect(comp.selectedYear).toBe(2027);
        expect(comp.selectedMonth).toBe(0);
        expect(comp.calendarDays.length).toBe(31); // January has 31 days
        expect(comp.calendarDays[0].dateString).toBe('1/1/2027');
        expect(comp.calendarDays.every(day => !day.isToday)).toBeTrue(); // real "today" isn't in Jan 2027
    });

    it('logout should clear the session and navigate to /login', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();
        const router = TestBed.inject(Router);
        spyOn(router, 'navigate');

        comp.logout();

        expect(authServiceSpy.logout).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
});

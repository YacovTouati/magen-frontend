import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../services/auth.service';
import { AssignmentService, ShiftAssignmentRecord } from '../../services/assignment.service';
import { UserManagementService } from '../../services/user-management.service';
import { VACANT_LABEL } from '../calendar/calendar.component';

describe('DashboardComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let assignmentServiceSpy: jasmine.SpyObj<AssignmentService>;
    let userManagementServiceSpy: jasmine.SpyObj<UserManagementService>;
    let usersChanged: Subject<void>;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser', 'isAdmin', 'logout']);
        authServiceSpy.getUser.and.returnValue({ email: 'admin@magen.org', role: 'ADMIN' });
        authServiceSpy.isAdmin.and.returnValue(true);

        assignmentServiceSpy = jasmine.createSpyObj('AssignmentService', ['getAssignments', 'assign', 'unassign']);
        assignmentServiceSpy.getAssignments.and.returnValue(of([]));

        usersChanged = new Subject<void>();
        userManagementServiceSpy = jasmine.createSpyObj('UserManagementService', ['getUsers', 'addUser', 'deleteUser']);
        (userManagementServiceSpy as any).usersChanged$ = usersChanged.asObservable();

        await TestBed.configureTestingModule({
            imports: [DashboardComponent, HttpClientTestingModule, RouterTestingModule],
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
                { provide: AssignmentService, useValue: assignmentServiceSpy },
                { provide: UserManagementService, useValue: userManagementServiceSpy }
            ]
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

    describe('loadCalendarForMonth (real API fetch)', () => {
        it('should fetch assignments for the full visible month and merge them onto the vacant scaffold', () => {
            const records: ShiftAssignmentRecord[] = [
                { id: 1, date: '2027-01-05', volunteerId: 9, volunteer: { id: 9, name: 'דנה כ.', email: 'dana@magen.org', role: 'VOLUNTEER' } }
            ];
            assignmentServiceSpy.getAssignments.and.returnValue(of(records));

            const fixture = TestBed.createComponent(DashboardComponent);
            const comp = fixture.componentInstance;
            comp.selectedYear = 2027;
            comp.selectedMonth = 0; // January
            fixture.detectChanges();

            expect(assignmentServiceSpy.getAssignments).toHaveBeenCalledWith('2027-01-01', '2027-01-31');
            expect(comp.calendarDays.length).toBe(31);
            expect(comp.calendarDays[4].dateString).toBe('5/1/2027');
            expect(comp.calendarDays[4].volunteer).toBe('דנה כ.');
            expect(comp.calendarDays[0].volunteer).toBe(VACANT_LABEL); // no assignment for day 1
            expect(comp.isLoadingCalendar).toBeFalse();
            expect(comp.calendarError).toBe('');
        });

        it('should surface a calendarError and still render a vacant scaffold when the fetch fails', () => {
            assignmentServiceSpy.getAssignments.and.returnValue(throwError(() => new Error('network down')));

            const fixture = TestBed.createComponent(DashboardComponent);
            const comp = fixture.componentInstance;
            fixture.detectChanges();

            expect(comp.calendarError).toBeTruthy();
            expect(comp.isLoadingCalendar).toBeFalse();
            expect(comp.calendarDays.every(day => day.volunteer === VACANT_LABEL)).toBeTrue();
        });
    });

    describe('reacting to UserManagementService.usersChanged$', () => {
        it('should refetch the currently-viewed month when a user is deleted elsewhere (e.g. cascade-deleted assignments)', () => {
            const fixture = TestBed.createComponent(DashboardComponent);
            const comp = fixture.componentInstance;
            comp.selectedYear = 2027;
            comp.selectedMonth = 0; // January
            fixture.detectChanges();
            assignmentServiceSpy.getAssignments.calls.reset();

            usersChanged.next();

            expect(assignmentServiceSpy.getAssignments).toHaveBeenCalledOnceWith('2027-01-01', '2027-01-31');
        });

        it('should stop listening after the component is destroyed', () => {
            const fixture = TestBed.createComponent(DashboardComponent);
            fixture.detectChanges();
            assignmentServiceSpy.getAssignments.calls.reset();

            fixture.destroy();
            usersChanged.next();

            expect(assignmentServiceSpy.getAssignments).not.toHaveBeenCalled();
        });
    });

    it('onMonthChange should update selectedYear/selectedMonth and refetch calendarDays for the newly selected month', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();
        assignmentServiceSpy.getAssignments.calls.reset();

        comp.onMonthChange({ year: 2027, month: 0 }); // January 2027

        expect(comp.selectedYear).toBe(2027);
        expect(comp.selectedMonth).toBe(0);
        expect(assignmentServiceSpy.getAssignments).toHaveBeenCalledWith('2027-01-01', '2027-01-31');
        expect(comp.calendarDays.length).toBe(31); // January has 31 days
        expect(comp.calendarDays[0].dateString).toBe('1/1/2027');
        expect(comp.calendarDays.every(day => !day.isToday)).toBeTrue(); // real "today" isn't in Jan 2027
    });

    describe('onAssignVolunteer / onUnassignVolunteer (syncing server-confirmed results)', () => {
        it('onAssignVolunteer should apply the ShiftAssignment payload to the matching calendar day, immutably', () => {
            const fixture = TestBed.createComponent(DashboardComponent);
            const comp = fixture.componentInstance;
            fixture.detectChanges();
            const originalDays = comp.calendarDays;

            comp.onAssignVolunteer({ dayIndex: 3, volunteerName: 'דנה כ.' });

            // replaces the array immutably (new references) so OnPush-strategy children fed
            // [calendarDays] as an @Input reliably detect the change.
            expect(comp.calendarDays).not.toBe(originalDays);
            expect(comp.calendarDays[3].volunteer).toBe('דנה כ.');
        });

        it('onUnassignVolunteer should reset the matching calendar day back to vacant, immutably', () => {
            const fixture = TestBed.createComponent(DashboardComponent);
            const comp = fixture.componentInstance;
            fixture.detectChanges();
            comp.onAssignVolunteer({ dayIndex: 3, volunteerName: 'דנה כ.' });
            const daysAfterAssign = comp.calendarDays;

            comp.onUnassignVolunteer(3);

            expect(comp.calendarDays).not.toBe(daysAfterAssign);
            expect(comp.calendarDays[3].volunteer).toBe(VACANT_LABEL);
        });
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

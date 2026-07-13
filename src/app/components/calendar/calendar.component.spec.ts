/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { CalendarComponent, CalendarDay } from './calendar.component';
import { AuthService } from '../../services/auth.service';
import { UserManagementService, User } from '../../services/user-management.service';
import { IntakeService } from '../../services/intake.service';
import { AssignmentService, ShiftAssignmentRecord } from '../../services/assignment.service';

function offsetDate(offsetDays: number): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    return date;
}

function buildDay(offsetDays: number, volunteer: string, isToday = false): CalendarDay {
    const date = offsetDate(offsetDays);
    return {
        dayNumber: date.getDate(),
        dateString: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
        volunteer,
        isToday
    };
}

// mirrors CalendarComponent's private toIsoDate(): "D/M/YYYY" -> zero-padded "YYYY-MM-DD"
function toIsoDate(dateString: string): string {
    const [day, month, year] = dateString.split('/').map(Number);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildAssignmentRecord(dateIso: string, volunteer: User): ShiftAssignmentRecord {
    return {
        id: 99,
        date: dateIso,
        volunteerId: Number(volunteer.id),
        volunteer: { id: Number(volunteer.id), name: volunteer.name, email: volunteer.email, role: volunteer.role }
    };
}

describe('CalendarComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let userServiceSpy: jasmine.SpyObj<UserManagementService>;
    let intakeServiceSpy: jasmine.SpyObj<IntakeService>;
    let assignmentServiceSpy: jasmine.SpyObj<AssignmentService>;

    const mockUsers: User[] = [
        { id: 1, name: 'שרה מ.', email: 'sara@magen.org', role: 'VOLUNTEER' },
        { id: 2, name: 'רבקה ס.', email: 'rivka@magen.org', role: 'ADMIN' }
    ];

    // future-safe fixture: offsets are relative to "today" at test-run time, so nothing here is ever in the past
    const defaultDays: CalendarDay[] = [
        buildDay(1, 'חלון פנוי', false),
        buildDay(2, 'שרה מ.', true)
    ];

    function setup(isAdmin: boolean, days: CalendarDay[] = defaultDays) {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin', 'getUser']);
        authServiceSpy.isAdmin.and.returnValue(isAdmin);
        authServiceSpy.getUser.and.returnValue({ email: 'admin@magen.org', role: isAdmin ? 'ADMIN' : 'VOLUNTEER' });

        userServiceSpy = jasmine.createSpyObj('UserManagementService', ['getUsers']);
        userServiceSpy.getUsers.and.returnValue(of(mockUsers));

        intakeServiceSpy = jasmine.createSpyObj('IntakeService', ['getIntakes', 'claimOwnership', 'undoClaim', 'takeOverCase', 'updateStatus']);
        intakeServiceSpy.getIntakes.and.returnValue(of([]));

        assignmentServiceSpy = jasmine.createSpyObj('AssignmentService', ['getAssignments', 'assign', 'unassign']);
        assignmentServiceSpy.getAssignments.and.returnValue(of([]));
        assignmentServiceSpy.assign.and.returnValue(of(buildAssignmentRecord('2026-01-01', mockUsers[0])));
        assignmentServiceSpy.unassign.and.returnValue(of(undefined));

        TestBed.configureTestingModule({
            imports: [CalendarComponent],
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
                { provide: UserManagementService, useValue: userServiceSpy },
                { provide: IntakeService, useValue: intakeServiceSpy },
                { provide: AssignmentService, useValue: assignmentServiceSpy }
            ]
        });

        const fixture = TestBed.createComponent(CalendarComponent);
        fixture.componentInstance.calendarDays = days;
        fixture.detectChanges();
        return fixture;
    }

    it('should create', () => {
        const fixture = setup(true);
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should build a 7-column week grid with the correct leading blanks for the first day', () => {
        const fixture = setup(true);
        const weeks = fixture.componentInstance.weeks;
        const expectedLeadingBlanks = offsetDate(1).getDay();

        expect(weeks[0].length).toBe(7);
        for (let i = 0; i < expectedLeadingBlanks; i++) {
            expect(weeks[0][i]).toBeNull();
        }
        expect(weeks[0][expectedLeadingBlanks]?.day.dayNumber).toBe(defaultDays[0].dayNumber);
    });

    it('should render day cells with vacant/assigned color-coding classes', () => {
        const fixture = setup(true);
        const cells = fixture.debugElement.queryAll(By.css('.day-cell:not(.empty-cell)'));

        expect(cells.length).toBe(2);
        expect(cells[0].nativeElement.classList).toContain('vacant-cell');
        expect(cells[1].nativeElement.classList).toContain('assigned-cell');
        expect(cells[1].nativeElement.classList).toContain('today-cell');
    });

    it('should show a loading banner and hide the grid while isLoadingCalendar is true', () => {
        const fixture = setup(true);
        fixture.componentInstance.isLoadingCalendar = true;
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('.calendar-status'))).toBeTruthy();
        expect(fixture.debugElement.query(By.css('.calendar-grid-wrapper'))).toBeFalsy();
    });

    it('should show an error banner (and still render the grid) when calendarError is set', () => {
        const fixture = setup(true);
        fixture.componentInstance.calendarError = 'לא ניתן לטעון את יומן המשמרות מהשרת כרגע.';
        fixture.detectChanges();

        const banner = fixture.debugElement.query(By.css('.calendar-status.error'));
        expect(banner).toBeTruthy();
        expect(banner.nativeElement.textContent).toContain('לא ניתן לטעון');
        expect(fixture.debugElement.query(By.css('.calendar-grid-wrapper'))).toBeTruthy();
    });

    describe('as ADMIN', () => {
        it('should mark cells as admin-clickable and clicking one opens the assignment modal and loads users', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;

            const firstCell = fixture.debugElement.query(By.css('.day-cell:not(.empty-cell)'));
            expect(firstCell.nativeElement.classList).toContain('admin-clickable');

            firstCell.triggerEventHandler('click', null);
            fixture.detectChanges();

            expect(comp.isAssignmentModalOpen).toBeTrue();
            expect(userServiceSpy.getUsers).toHaveBeenCalled();
            expect(comp.assignableUsers).toEqual(mockUsers);
            expect(comp.assignmentDayLabel).toContain(String(defaultDays[0].dayNumber));
        });

        it('selecting a user in the modal should call AssignmentService.assign with the ISO date and volunteer id, then emit a ShiftAssignment and close the modal', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;
            const expectedIso = toIsoDate(defaultDays[0].dateString);
            assignmentServiceSpy.assign.and.returnValue(of(buildAssignmentRecord(expectedIso, mockUsers[1])));
            spyOn(comp.assignVolunteer, 'emit');
            spyOn(comp.navigateToTab, 'emit');

            const firstCell = fixture.debugElement.query(By.css('.day-cell:not(.empty-cell)'));
            firstCell.triggerEventHandler('click', null); // day index 0 (vacant day)
            fixture.detectChanges();

            comp.selectUserForAssignment(mockUsers[1]);

            expect(assignmentServiceSpy.assign).toHaveBeenCalledWith(expectedIso, 2);
            expect(comp.assignVolunteer.emit).toHaveBeenCalledWith({ dayIndex: 0, volunteerName: 'רבקה ס.' });
            expect(comp.navigateToTab.emit).not.toHaveBeenCalled();
            expect(comp.isAssignmentModalOpen).toBeFalse();
            expect(comp.assignableUsers).toEqual([]);
            expect(comp.isSavingAssignment).toBeFalse();
        });

        it('should surface an assignmentActionError and keep the modal open when the assign request fails', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;
            assignmentServiceSpy.assign.and.returnValue(throwError(() => new Error('validation failed')));
            spyOn(comp.assignVolunteer, 'emit');

            const firstCell = fixture.debugElement.query(By.css('.day-cell:not(.empty-cell)'));
            firstCell.triggerEventHandler('click', null);
            fixture.detectChanges();

            comp.selectUserForAssignment(mockUsers[1]);

            expect(comp.assignVolunteer.emit).not.toHaveBeenCalled();
            expect(comp.assignmentActionError).toBeTruthy();
            expect(comp.isSavingAssignment).toBeFalse();
            expect(comp.isAssignmentModalOpen).toBeTrue();
        });

        it('should expose the currently-assigned volunteer and call AssignmentService.unassign, then emit the day index and close the modal', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;
            const expectedIso = toIsoDate(defaultDays[1].dateString);
            spyOn(comp.unassignVolunteer, 'emit');

            const cells = fixture.debugElement.queryAll(By.css('.day-cell:not(.empty-cell)'));
            cells[1].triggerEventHandler('click', null); // day index 1 (assigned to 'שרה מ.')
            fixture.detectChanges();

            expect(comp.assignmentCurrentVolunteer).toBe('שרה מ.');

            comp.unassignCurrent();

            expect(assignmentServiceSpy.unassign).toHaveBeenCalledWith(expectedIso);
            expect(comp.unassignVolunteer.emit).toHaveBeenCalledWith(1);
            expect(comp.isAssignmentModalOpen).toBeFalse();
            expect(comp.isSavingAssignment).toBeFalse();
        });

        it('should surface an assignmentActionError and keep the modal open when the unassign request fails', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;
            assignmentServiceSpy.unassign.and.returnValue(throwError(() => new Error('not found')));
            spyOn(comp.unassignVolunteer, 'emit');

            const cells = fixture.debugElement.queryAll(By.css('.day-cell:not(.empty-cell)'));
            cells[1].triggerEventHandler('click', null);
            fixture.detectChanges();

            comp.unassignCurrent();

            expect(comp.unassignVolunteer.emit).not.toHaveBeenCalled();
            expect(comp.assignmentActionError).toBeTruthy();
            expect(comp.isAssignmentModalOpen).toBeTrue();
        });

        it('assignmentCurrentVolunteer should be null when opening the modal for a vacant day', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;

            const firstCell = fixture.debugElement.query(By.css('.day-cell:not(.empty-cell)'));
            firstCell.triggerEventHandler('click', null); // vacant day
            fixture.detectChanges();

            expect(comp.assignmentCurrentVolunteer).toBeNull();
        });

        it('should surface an error in the modal when loading users fails', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;
            userServiceSpy.getUsers.and.returnValue(throwError(() => new Error('network down')));

            const firstCell = fixture.debugElement.query(By.css('.day-cell:not(.empty-cell)'));
            firstCell.triggerEventHandler('click', null);

            expect(comp.usersError).toBeTruthy();
            expect(comp.isLoadingUsers).toBeFalse();
        });

        it('should show the management mode badge', () => {
            const fixture = setup(true);
            const badge = fixture.debugElement.query(By.css('.mode-badge'));
            expect(badge.nativeElement.classList).toContain('admin-mode');
        });

        it('should render the intake alerts panel for an admin', () => {
            const fixture = setup(true);
            expect(fixture.debugElement.query(By.css('app-intake-alerts'))).toBeTruthy();
        });
    });

    describe('as VOLUNTEER', () => {
        it('should mark cells as volunteer-clickable and clicking one navigates to the report tab without opening the modal', () => {
            const fixture = setup(false);
            const comp = fixture.componentInstance;
            spyOn(comp.assignVolunteer, 'emit');
            spyOn(comp.navigateToTab, 'emit');

            const firstCell = fixture.debugElement.query(By.css('.day-cell:not(.empty-cell)'));
            expect(firstCell.nativeElement.classList).toContain('volunteer-clickable');
            expect(firstCell.nativeElement.classList).not.toContain('admin-clickable');

            firstCell.triggerEventHandler('click', null);

            expect(comp.navigateToTab.emit).toHaveBeenCalledWith('report');
            expect(comp.assignVolunteer.emit).not.toHaveBeenCalled();
            expect(comp.isAssignmentModalOpen).toBeFalse();
            expect(userServiceSpy.getUsers).not.toHaveBeenCalled();
        });

        it('openAssignmentModal(), selectUserForAssignment() and unassignCurrent() should remain no-ops even if called directly', () => {
            const fixture = setup(false);
            const comp = fixture.componentInstance;
            spyOn(comp.assignVolunteer, 'emit');
            spyOn(comp.unassignVolunteer, 'emit');

            comp.openAssignmentModal({ day: comp.calendarDays[0], index: 0 });
            expect(comp.isAssignmentModalOpen).toBeFalse();
            expect(userServiceSpy.getUsers).not.toHaveBeenCalled();

            comp.selectUserForAssignment(mockUsers[0]);
            expect(comp.assignVolunteer.emit).not.toHaveBeenCalled();
            expect(assignmentServiceSpy.assign).not.toHaveBeenCalled();

            comp.unassignCurrent();
            expect(comp.unassignVolunteer.emit).not.toHaveBeenCalled();
            expect(assignmentServiceSpy.unassign).not.toHaveBeenCalled();
        });

        it('should show the read-only mode badge', () => {
            const fixture = setup(false);
            const badge = fixture.debugElement.query(By.css('.mode-badge'));
            expect(badge.nativeElement.classList).toContain('volunteer-mode');
        });

        it('should NOT render the intake alerts panel for a volunteer', () => {
            const fixture = setup(false);
            expect(fixture.debugElement.query(By.css('app-intake-alerts'))).toBeFalsy();
        });
    });

    describe('past dates', () => {
        it('isPast() should be true only for dates strictly before today', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;

            expect(comp.isPast(buildDay(-1, 'חלון פנוי'))).toBeTrue();
            expect(comp.isPast(buildDay(0, 'חלון פנוי'))).toBeFalse();
            expect(comp.isPast(buildDay(1, 'חלון פנוי'))).toBeFalse();
        });

        it('should render past cells without admin-clickable, and an admin click should not open the modal or fetch users', () => {
            const pastDays = [buildDay(-2, 'רבקה ס.', false)];
            const fixture = setup(true, pastDays);
            const comp = fixture.componentInstance;

            const cell = fixture.debugElement.query(By.css('.day-cell:not(.empty-cell)'));
            expect(cell.nativeElement.classList).toContain('past-date');
            expect(cell.nativeElement.classList).not.toContain('admin-clickable');

            cell.triggerEventHandler('click', null);

            expect(comp.isAssignmentModalOpen).toBeFalse();
            expect(userServiceSpy.getUsers).not.toHaveBeenCalled();
        });

        it('openAssignmentModal() should be a no-op for a past date even if called directly by an admin', () => {
            const pastDays = [buildDay(-3, 'חלון פנוי', false)];
            const fixture = setup(true, pastDays);
            const comp = fixture.componentInstance;

            comp.openAssignmentModal({ day: comp.calendarDays[0], index: 0 });

            expect(comp.isAssignmentModalOpen).toBeFalse();
            expect(userServiceSpy.getUsers).not.toHaveBeenCalled();
        });

        it('should still let a volunteer click a past date to report a call', () => {
            const pastDays = [buildDay(-2, 'רבקה ס.', false)];
            const fixture = setup(false, pastDays);
            const comp = fixture.componentInstance;
            spyOn(comp.navigateToTab, 'emit');

            const cell = fixture.debugElement.query(By.css('.day-cell:not(.empty-cell)'));
            expect(cell.nativeElement.classList).toContain('volunteer-clickable');

            cell.triggerEventHandler('click', null);

            expect(comp.navigateToTab.emit).toHaveBeenCalledWith('report');
        });

        it('should hide the assign hint for a past admin cell but keep the history color-coding visible', () => {
            const pastDays = [buildDay(-5, 'רבקה ס.', false)];
            const fixture = setup(true, pastDays);
            const comp = fixture.componentInstance;

            expect(comp.getCellHint({ day: pastDays[0], index: 0 })).toBe('');

            const cell = fixture.debugElement.query(By.css('.day-cell:not(.empty-cell)'));
            expect(cell.nativeElement.classList).toContain('assigned-cell');
        });
    });

    describe('month picker', () => {
        it('monthOptions should span a window of months before and after today', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;

            expect(comp.monthOptions.length).toBe(25); // 12 before + current + 12 after
            const keys = comp.monthOptions.map(o => o.key);
            expect(new Set(keys).size).toBe(25); // all unique
        });

        it('should show only the Hebrew month name for a month within the real current year', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;
            const currentYear = new Date().getFullYear();
            const option = comp.monthOptions.find(o => o.year === currentYear);

            expect(option).toBeTruthy();
            expect(option!.label).not.toMatch(/\d/); // no digits — no year suffix
        });

        it('should append the short 2-digit year for a month outside the real current year', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;
            const currentYear = new Date().getFullYear();
            const nextYearOption = comp.monthOptions.find(o => o.year === currentYear + 1);

            expect(nextYearOption).toBeTruthy();
            expect(nextYearOption!.label).toContain(String(currentYear + 1).slice(-2));
        });

        it('selectedMonthKey and headerLabel should reflect the year/month inputs', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;
            comp.year = 2027;
            comp.month = 0; // January

            expect(comp.selectedMonthKey).toBe('2027-0');
            expect(comp.headerLabel).toContain('ינואר');
            expect(comp.headerLabel).toContain('27');
        });

        it('onMonthSelect() should emit monthChange with the parsed year/month, and isPast() should stay pinned to the real date', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;
            spyOn(comp.monthChange, 'emit');

            comp.onMonthSelect('2027-5');

            expect(comp.monthChange.emit).toHaveBeenCalledWith({ year: 2027, month: 5 });
            // isPast() must always compare against the real world date, never the currently browsed month
            const farFutureDay = { dayNumber: 1, dateString: '1/6/2027', volunteer: 'חלון פנוי', isToday: false };
            expect(comp.isPast(farFutureDay)).toBeFalse();
            const farPastDay = { dayNumber: 1, dateString: '1/1/2020', volunteer: 'חלון פנוי', isToday: false };
            expect(comp.isPast(farPastDay)).toBeTrue();
        });

        it('selecting a different month in the DOM select should emit monthChange', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;
            spyOn(comp.monthChange, 'emit');

            const select: HTMLSelectElement = fixture.debugElement.query(By.css('.month-select')).nativeElement;
            const targetOption = comp.monthOptions.find(o => o.key !== comp.selectedMonthKey)!;
            select.value = targetOption.key;
            select.dispatchEvent(new Event('change'));
            fixture.detectChanges();

            expect(comp.monthChange.emit).toHaveBeenCalledWith({ year: targetOption.year, month: targetOption.month });
        });
    });

    it('goToReports() should emit navigateToTab("report")', () => {
        const fixture = setup(true);
        const comp = fixture.componentInstance;
        spyOn(comp.navigateToTab, 'emit');

        comp.goToReports();

        expect(comp.navigateToTab.emit).toHaveBeenCalledWith('report');
    });

    it('goToScenarios() should emit navigateToTab("samples")', () => {
        const fixture = setup(true);
        const comp = fixture.componentInstance;
        spyOn(comp.navigateToTab, 'emit');

        comp.goToScenarios();

        expect(comp.navigateToTab.emit).toHaveBeenCalledWith('samples');
    });
});

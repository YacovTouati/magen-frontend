/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { CalendarComponent, CalendarDay } from './calendar.component';
import { AuthService } from '../../services/auth.service';
import { UserManagementService, User } from '../../services/user-management.service';
import { IntakeService } from '../../services/intake.service';

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

describe('CalendarComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let userServiceSpy: jasmine.SpyObj<UserManagementService>;
    let intakeServiceSpy: jasmine.SpyObj<IntakeService>;

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

        TestBed.configureTestingModule({
            imports: [CalendarComponent],
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
                { provide: UserManagementService, useValue: userServiceSpy },
                { provide: IntakeService, useValue: intakeServiceSpy }
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

        it('selecting a user in the modal should emit a ShiftAssignment for the clicked day and close the modal', () => {
            const fixture = setup(true);
            const comp = fixture.componentInstance;
            spyOn(comp.assignVolunteer, 'emit');
            spyOn(comp.navigateToTab, 'emit');

            const firstCell = fixture.debugElement.query(By.css('.day-cell:not(.empty-cell)'));
            firstCell.triggerEventHandler('click', null); // day index 0 (vacant day)
            fixture.detectChanges();

            comp.selectUserForAssignment(mockUsers[1]);

            expect(comp.assignVolunteer.emit).toHaveBeenCalledWith({ dayIndex: 0, volunteerName: 'רבקה ס.' });
            expect(comp.navigateToTab.emit).not.toHaveBeenCalled();
            expect(comp.isAssignmentModalOpen).toBeFalse();
            expect(comp.assignableUsers).toEqual([]);
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

        it('openAssignmentModal() and selectUserForAssignment() should remain no-ops even if called directly', () => {
            const fixture = setup(false);
            const comp = fixture.componentInstance;
            spyOn(comp.assignVolunteer, 'emit');

            comp.openAssignmentModal({ day: comp.calendarDays[0], index: 0 });
            expect(comp.isAssignmentModalOpen).toBeFalse();
            expect(userServiceSpy.getUsers).not.toHaveBeenCalled();

            comp.selectUserForAssignment(mockUsers[0]);
            expect(comp.assignVolunteer.emit).not.toHaveBeenCalled();
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

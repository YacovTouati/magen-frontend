import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { SidebarComponent } from './sidebar.component';
import { IntakeService } from '../../services/intake.service';

describe('SidebarComponent', () => {
    let intakeServiceSpy: jasmine.SpyObj<IntakeService>;

    beforeEach(async () => {
        intakeServiceSpy = jasmine.createSpyObj('IntakeService', ['getUnhandledCount']);
        intakeServiceSpy.getUnhandledCount.and.returnValue(of(0));

        await TestBed.configureTestingModule({
            imports: [SidebarComponent, RouterTestingModule],
            providers: [{ provide: IntakeService, useValue: intakeServiceSpy }]
        }).compileComponents();
    });

    function usersButton(fixture: ReturnType<typeof TestBed.createComponent<SidebarComponent>>) {
        return fixture.debugElement.queryAll(By.css('.nav-btn')).find(
            btn => (btn.nativeElement.textContent || '').includes('ניהול משתמשים')
        );
    }

    function chartsButton(fixture: ReturnType<typeof TestBed.createComponent<SidebarComponent>>) {
        return fixture.debugElement.queryAll(By.css('.nav-btn')).find(
            btn => (btn.nativeElement.textContent || '').includes('דוחות ואנליטיקה')
        );
    }

    function samplesButton(fixture: ReturnType<typeof TestBed.createComponent<SidebarComponent>>) {
        return fixture.debugElement.queryAll(By.css('.nav-btn')).find(
            btn => (btn.nativeElement.textContent || '').includes('שיחות ותרחישים לדוגמה')
        );
    }

    function intakesButton(fixture: ReturnType<typeof TestBed.createComponent<SidebarComponent>>) {
        return fixture.debugElement.queryAll(By.css('.nav-btn')).find(
            btn => (btn.nativeElement.textContent || '').includes('אינטייקים')
        );
    }

    function roleBadge(fixture: ReturnType<typeof TestBed.createComponent<SidebarComponent>>) {
        return fixture.debugElement.query(By.css('.role-badge'));
    }

    it('should create', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        const comp = fixture.componentInstance;
        expect(comp).toBeTruthy();
    });

    it('should hide "ניהול משתמשים" (user management) for a non-super-admin, even if isAdmin is true', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        fixture.componentInstance.isAdmin = true;
        fixture.componentInstance.isSuperAdmin = false;
        fixture.detectChanges();

        expect(usersButton(fixture)).toBeFalsy();
    });

    it('should show "ניהול משתמשים" (user management) only for isSuperAdmin', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        fixture.componentInstance.isAdmin = true;
        fixture.componentInstance.isSuperAdmin = true;
        fixture.detectChanges();

        expect(usersButton(fixture)).toBeTruthy();
    });

    it('should hide "דוחות ואנליטיקה" (reports & analytics) for a VOLUNTEER (isAdmin false)', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        fixture.componentInstance.isAdmin = false;
        fixture.detectChanges();

        expect(chartsButton(fixture)).toBeFalsy();
    });

    it('should show "דוחות ואנליטיקה" (reports & analytics) for any admin role (isAdmin true)', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        fixture.componentInstance.isAdmin = true;
        fixture.detectChanges();

        expect(chartsButton(fixture)).toBeTruthy();
    });

    it('should hide "שיחות ותרחישים לדוגמה" (sample calls) for INTAKE_ADMIN', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        fixture.componentInstance.isAdmin = true;
        fixture.componentInstance.isIntakeAdmin = true;
        fixture.detectChanges();

        expect(samplesButton(fixture)).toBeFalsy();
    });

    it('should hide "שיחות ותרחישים לדוגמה" (sample calls) for SCHEDULER_ADMIN', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        fixture.componentInstance.isAdmin = true;
        fixture.componentInstance.isSchedulerAdmin = true;
        fixture.detectChanges();

        expect(samplesButton(fixture)).toBeFalsy();
    });

    it('should show "שיחות ותרחישים לדוגמה" (sample calls) for SUPER_ADMIN', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        fixture.componentInstance.isAdmin = true;
        fixture.componentInstance.isSuperAdmin = true;
        fixture.detectChanges();

        expect(samplesButton(fixture)).toBeTruthy();
    });

    it('should hide "שיחות ותרחישים לדוגמה" (sample calls) for a VOLUNTEER', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        fixture.componentInstance.isAdmin = false;
        fixture.detectChanges();

        expect(samplesButton(fixture)).toBeFalsy();
    });

    describe('אינטייקים tab', () => {
        it('should hide the tab and never call the count endpoint for a VOLUNTEER', () => {
            const fixture = TestBed.createComponent(SidebarComponent);
            fixture.detectChanges();

            expect(intakesButton(fixture)).toBeFalsy();
            expect(intakeServiceSpy.getUnhandledCount).not.toHaveBeenCalled();
        });

        it('should hide the tab for a SCHEDULER_ADMIN', () => {
            const fixture = TestBed.createComponent(SidebarComponent);
            fixture.componentInstance.isSchedulerAdmin = true;
            fixture.detectChanges();

            expect(intakesButton(fixture)).toBeFalsy();
        });

        it('should show the tab for SUPER_ADMIN', () => {
            const fixture = TestBed.createComponent(SidebarComponent);
            fixture.componentInstance.isSuperAdmin = true;
            fixture.detectChanges();

            expect(intakesButton(fixture)).toBeTruthy();
        });

        it('should show the tab for INTAKE_ADMIN and start polling the unhandled count', fakeAsync(() => {
            const fixture = TestBed.createComponent(SidebarComponent);
            fixture.componentInstance.isIntakeAdmin = true;
            fixture.detectChanges();

            expect(intakesButton(fixture)).toBeTruthy();

            tick(0); // let the immediate (timer(0, ...)) first tick fire
            expect(intakeServiceSpy.getUnhandledCount).toHaveBeenCalledTimes(1);

            discardPeriodicTasks();
        }));

        it('should render the badge with the fetched count once it arrives', fakeAsync(() => {
            intakeServiceSpy.getUnhandledCount.and.returnValue(of(5));
            const fixture = TestBed.createComponent(SidebarComponent);
            fixture.componentInstance.isSuperAdmin = true;
            fixture.detectChanges();

            tick(0);
            fixture.detectChanges(); // OnPush: re-render after markForCheck()

            const badge = fixture.debugElement.query(By.css('.nav-badge'));
            expect(badge.nativeElement.textContent.trim()).toBe('5');

            discardPeriodicTasks();
        }));

        it('should hide the badge entirely when the count is 0', fakeAsync(() => {
            intakeServiceSpy.getUnhandledCount.and.returnValue(of(0));
            const fixture = TestBed.createComponent(SidebarComponent);
            fixture.componentInstance.isSuperAdmin = true;
            fixture.detectChanges();

            tick(0);
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('.nav-badge'))).toBeFalsy();

            discardPeriodicTasks();
        }));

        it('should poll again after the interval elapses', fakeAsync(() => {
            const fixture = TestBed.createComponent(SidebarComponent);
            fixture.componentInstance.isSuperAdmin = true;
            fixture.detectChanges();

            tick(0);
            expect(intakeServiceSpy.getUnhandledCount).toHaveBeenCalledTimes(1);

            tick(15000);
            expect(intakeServiceSpy.getUnhandledCount).toHaveBeenCalledTimes(2);

            discardPeriodicTasks();
        }));

        it('should keep showing the last known count if a later poll fails, rather than clearing it', fakeAsync(() => {
            intakeServiceSpy.getUnhandledCount.and.returnValue(of(3));
            const fixture = TestBed.createComponent(SidebarComponent);
            const comp = fixture.componentInstance;
            comp.isSuperAdmin = true;
            fixture.detectChanges();
            tick(0);

            expect(comp.unhandledIntakeCount).toBe(3);

            intakeServiceSpy.getUnhandledCount.and.returnValue(throwError(() => new Error('boom')));
            tick(15000);

            expect(comp.unhandledIntakeCount).toBe(3);

            discardPeriodicTasks();
        }));
    });

    describe('role badge', () => {
        it('should show "ממשק מנהל ראשי" for SUPER_ADMIN', () => {
            const fixture = TestBed.createComponent(SidebarComponent);
            fixture.componentInstance.isSuperAdmin = true;
            fixture.detectChanges();

            const badge = roleBadge(fixture);
            expect(badge.nativeElement.textContent.trim()).toBe('ממשק מנהל ראשי');
            expect(badge.nativeElement.classList).toContain('role-super-admin');
        });

        it('should show "ממשק מנהל אינטייק" for INTAKE_ADMIN', () => {
            const fixture = TestBed.createComponent(SidebarComponent);
            fixture.componentInstance.isIntakeAdmin = true;
            fixture.detectChanges();

            const badge = roleBadge(fixture);
            expect(badge.nativeElement.textContent.trim()).toBe('ממשק מנהל אינטייק');
            expect(badge.nativeElement.classList).toContain('role-intake-admin');
        });

        it('should show "ממשק מנהל שיבוצים" for SCHEDULER_ADMIN', () => {
            const fixture = TestBed.createComponent(SidebarComponent);
            fixture.componentInstance.isSchedulerAdmin = true;
            fixture.detectChanges();

            const badge = roleBadge(fixture);
            expect(badge.nativeElement.textContent.trim()).toBe('ממשק מנהל שיבוצים');
            expect(badge.nativeElement.classList).toContain('role-scheduler-admin');
        });

        it('should show "ממשק מתנדב" when no admin flag is set', () => {
            const fixture = TestBed.createComponent(SidebarComponent);
            fixture.detectChanges();

            const badge = roleBadge(fixture);
            expect(badge.nativeElement.textContent.trim()).toBe('ממשק מתנדב');
            expect(badge.nativeElement.classList).toContain('role-volunteer');
        });

        it('should prioritize isSuperAdmin over the other role flags if more than one is somehow set', () => {
            const fixture = TestBed.createComponent(SidebarComponent);
            fixture.componentInstance.isSuperAdmin = true;
            fixture.componentInstance.isIntakeAdmin = true;
            fixture.componentInstance.isSchedulerAdmin = true;
            fixture.detectChanges();

            expect(roleBadge(fixture).nativeElement.textContent.trim()).toBe('ממשק מנהל ראשי');
        });
    });
});

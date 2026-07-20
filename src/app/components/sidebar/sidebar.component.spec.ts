import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [SidebarComponent, RouterTestingModule] }).compileComponents();
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

    it('should show "שיחות ותרחישים לדוגמה" (sample calls) for a VOLUNTEER', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        fixture.componentInstance.isAdmin = false;
        fixture.detectChanges();

        expect(samplesButton(fixture)).toBeTruthy();
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

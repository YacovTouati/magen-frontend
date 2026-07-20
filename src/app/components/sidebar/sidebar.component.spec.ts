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
});

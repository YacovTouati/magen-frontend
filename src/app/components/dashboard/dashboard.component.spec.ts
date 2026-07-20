import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../services/auth.service';

describe('DashboardComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser', 'isAdmin', 'isSuperAdmin', 'isIntakeAdmin', 'logout']);
        authServiceSpy.getUser.and.returnValue({ email: 'admin@magen.org', role: 'SUPER_ADMIN' });
        authServiceSpy.isAdmin.and.returnValue(true);
        authServiceSpy.isSuperAdmin.and.returnValue(true);
        authServiceSpy.isIntakeAdmin.and.returnValue(false);

        await TestBed.configureTestingModule({
            imports: [DashboardComponent, HttpClientTestingModule, RouterTestingModule],
            providers: [
                { provide: AuthService, useValue: authServiceSpy }
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
        expect(comp.isSuperAdmin).toBeTrue();
        expect(comp.isIntakeAdmin).toBeFalse();
    });

    it('should mount the intake alerts panel for a SUPER_ADMIN', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('app-intake-alerts'))).toBeTruthy();
    });

    it('should mount the intake alerts panel for an INTAKE_ADMIN', () => {
        authServiceSpy.isSuperAdmin.and.returnValue(false);
        authServiceSpy.isIntakeAdmin.and.returnValue(true);
        const fixture = TestBed.createComponent(DashboardComponent);
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('app-intake-alerts'))).toBeTruthy();
    });

    it('should hide the intake alerts panel for a SCHEDULER_ADMIN or VOLUNTEER (neither SUPER_ADMIN nor INTAKE_ADMIN)', () => {
        authServiceSpy.isSuperAdmin.and.returnValue(false);
        authServiceSpy.isIntakeAdmin.and.returnValue(false);
        const fixture = TestBed.createComponent(DashboardComponent);
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('app-intake-alerts'))).toBeFalsy();
    });

    it('should default to the report tab (call report form) for the root, non-admin, non-shifts route', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();

        expect(comp.currentTab).toBe('report');
        expect(comp.isAdminUsersRoute()).toBeFalse();
        expect(comp.isShiftsRoute()).toBeFalse();
    });

    it('switchTab("calendar") should navigate to /shifts — the calendar tab now points at ShiftBoardComponent', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();
        const router = TestBed.inject(Router);
        spyOn(router, 'navigate');

        comp.switchTab('calendar');

        expect(router.navigate).toHaveBeenCalledWith(['/shifts']);
    });

    it('switchTab("users") should navigate to /admin/users', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();
        const router = TestBed.inject(Router);
        spyOn(router, 'navigate');

        comp.switchTab('users');

        expect(router.navigate).toHaveBeenCalledWith(['/admin/users']);
    });

    it('should treat /shifts as a routed view (isShiftsRoute) and keep the calendar tab highlighted', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();
        const router = TestBed.inject(Router);

        (comp as any).currentRoute = '/shifts';
        (comp as any).updateCurrentTabFromRoute();

        expect(comp.isShiftsRoute()).toBeTrue();
        expect(comp.currentTab).toBe('calendar');
    });

    it('returning to "/" from /shifts falls back to the report tab, not a blank calendar tab', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();

        (comp as any).currentRoute = '/shifts';
        (comp as any).updateCurrentTabFromRoute();
        expect(comp.currentTab).toBe('calendar');

        (comp as any).currentRoute = '/';
        (comp as any).updateCurrentTabFromRoute();
        expect(comp.currentTab).toBe('report');
    });

    it('returning to "/" while already on a legacy tab (e.g. charts) keeps that tab active', () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();

        comp.currentTab = 'charts';
        (comp as any).currentRoute = '/';
        (comp as any).updateCurrentTabFromRoute();

        expect(comp.currentTab).toBe('charts');
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

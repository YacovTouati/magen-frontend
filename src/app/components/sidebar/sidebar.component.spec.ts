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
});

import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { By } from '@angular/platform-browser';
import { UserEditModalComponent } from './user-edit-modal.component';
import { User } from '../../services/user-management.service';

const SAMPLE_USER: User = {
    id: 5,
    name: 'דנה לוי',
    email: 'dana@example.com',
    role: 'VOLUNTEER'
};

describe('UserEditModalComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [UserEditModalComponent] }).compileComponents();
    });

    // Same helper as ShiftNoteModalComponent's spec: fixture.changeDetectorRef isn't the
    // OnPush component's own injector-scoped instance, so a direct property mutation +
    // fixture.detectChanges() alone silently no-ops without this.
    function markOwnViewDirty(fixture: any): void {
        fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    }

    function create(): any {
        const fixture = TestBed.createComponent(UserEditModalComponent);
        fixture.componentInstance.isOpen = true;
        return fixture;
    }

    it('should create', () => {
        const fixture = create();
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render nothing when user is null', () => {
        const fixture = create();
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('.modal-title'))).toBeFalsy();
    });

    it('should pre-fill the draft fields from the bound user', () => {
        const fixture = create();
        const comp = fixture.componentInstance;
        comp.user = SAMPLE_USER;
        comp.ngOnChanges({ user: {} as any });
        fixture.detectChanges();

        expect(comp.draftName).toBe('דנה לוי');
        expect(comp.draftEmail).toBe('dana@example.com');
        expect(comp.draftRole).toBe('VOLUNTEER');
    });

    it('should reset the draft to the newly bound user, not carry over a stale draft', () => {
        const fixture = create();
        const comp = fixture.componentInstance;
        comp.user = SAMPLE_USER;
        comp.ngOnChanges({ user: {} as any });
        comp.draftName = 'שם זמני שלא נשמר';

        comp.user = { id: 9, name: 'אורי כהן', email: 'uri@example.com', role: 'SUPER_ADMIN' };
        comp.ngOnChanges({ user: {} as any });

        expect(comp.draftName).toBe('אורי כהן');
        expect(comp.draftEmail).toBe('uri@example.com');
        expect(comp.draftRole).toBe('SUPER_ADMIN');
    });

    it('onClose() should emit closed', () => {
        const fixture = create();
        const comp = fixture.componentInstance;
        comp.user = SAMPLE_USER;
        fixture.detectChanges();
        spyOn(comp.closed, 'emit');

        comp.onClose();

        expect(comp.closed.emit).toHaveBeenCalled();
    });

    describe('onSave', () => {
        it('should emit the trimmed draft payload via saved', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.user = SAMPLE_USER;
            comp.ngOnChanges({ user: {} as any });
            fixture.detectChanges();
            spyOn(comp.saved, 'emit');

            comp.draftName = '  דנה לוי מעודכן  ';
            comp.draftEmail = '  dana.new@example.com  ';
            comp.draftRole = 'SCHEDULER_ADMIN';
            comp.onSave();

            expect(comp.saved.emit).toHaveBeenCalledWith({
                name: 'דנה לוי מעודכן',
                email: 'dana.new@example.com',
                role: 'SCHEDULER_ADMIN'
            });
        });

        it('should not emit when the name is blank', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.user = SAMPLE_USER;
            comp.ngOnChanges({ user: {} as any });
            fixture.detectChanges();
            spyOn(comp.saved, 'emit');

            comp.draftName = '   ';
            comp.onSave();

            expect(comp.saved.emit).not.toHaveBeenCalled();
        });

        it('should not emit when the email is blank', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.user = SAMPLE_USER;
            comp.ngOnChanges({ user: {} as any });
            fixture.detectChanges();
            spyOn(comp.saved, 'emit');

            comp.draftEmail = '   ';
            comp.onSave();

            expect(comp.saved.emit).not.toHaveBeenCalled();
        });

        it('should not emit while isSaving is true', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.user = SAMPLE_USER;
            comp.ngOnChanges({ user: {} as any });
            comp.isSaving = true;
            fixture.detectChanges();
            spyOn(comp.saved, 'emit');

            comp.onSave();

            expect(comp.saved.emit).not.toHaveBeenCalled();
        });

        it('the save button should be disabled while isSaving is true', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.user = SAMPLE_USER;
            comp.ngOnChanges({ user: {} as any });
            comp.isSaving = true;
            markOwnViewDirty(fixture);
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('.btn-save')).nativeElement.disabled).toBeTrue();
        });
    });

    it('should display a save error message when saveError is set (e.g. a 409 email conflict)', () => {
        const fixture = create();
        const comp = fixture.componentInstance;
        comp.user = SAMPLE_USER;
        comp.saveError = 'כתובת המייל כבר בשימוש על ידי משתמש אחר';
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('.field-error')).nativeElement.textContent).toContain('כתובת המייל כבר בשימוש');
    });

    it('should expose all four roles in the role dropdown', () => {
        const fixture = create();
        const comp = fixture.componentInstance;
        comp.user = SAMPLE_USER;
        fixture.detectChanges();

        expect(comp.roleOptions.map((o: { value: string }) => o.value)).toEqual(['SUPER_ADMIN', 'INTAKE_ADMIN', 'SCHEDULER_ADMIN', 'VOLUNTEER']);
    });
});

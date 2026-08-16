import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ShiftNoteModalComponent } from './shift-note-modal.component';
import { ShiftRecord } from '../../services/schedule.service';

const SHIFT_WITH_NOTE: ShiftRecord = {
    id: 7,
    date: '2026-08-16',
    type: 'MORNING',
    status: 'LOCKED',
    volunteer: { id: 3, name: 'מירי', email: 'miri@example.com', role: 'VOLUNTEER' },
    note: 'מירי עבדה עד 18:00'
};

const SHIFT_WITHOUT_NOTE: ShiftRecord = {
    ...SHIFT_WITH_NOTE,
    id: 8,
    note: null
};

describe('ShiftNoteModalComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [ShiftNoteModalComponent] }).compileComponents();
    });

    // See intake-detail-modal.component.spec.ts's identical helper: fixture.changeDetectorRef
    // is NOT the same instance as the OnPush component's own injector-scoped one, so a direct
    // property mutation + fixture.detectChanges() alone silently no-ops without this.
    function markOwnViewDirty(fixture: any): void {
        fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    }

    function create(): any {
        const fixture = TestBed.createComponent(ShiftNoteModalComponent);
        fixture.componentInstance.isOpen = true;
        return fixture;
    }

    it('should create', () => {
        const fixture = create();
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render nothing when shift is null', () => {
        const fixture = create();
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('.modal-title'))).toBeFalsy();
    });

    describe('when the shift has a note', () => {
        it('should open in read-only view mode showing the note text', () => {
            const fixture = create();
            fixture.componentInstance.shift = SHIFT_WITH_NOTE;
            fixture.detectChanges();

            expect(fixture.componentInstance.isEditing).toBeFalse();
            expect(fixture.debugElement.query(By.css('.note-text')).nativeElement.textContent.trim()).toBe(SHIFT_WITH_NOTE.note);
            expect(fixture.debugElement.query(By.css('.note-textarea'))).toBeFalsy();
        });

        it('should show edit/delete buttons when canManage is true', () => {
            const fixture = create();
            fixture.componentInstance.shift = SHIFT_WITH_NOTE;
            fixture.componentInstance.canManage = true;
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('.btn-edit'))).toBeTruthy();
            expect(fixture.debugElement.query(By.css('.btn-delete'))).toBeTruthy();
        });

        it('should show only a close button when canManage is false', () => {
            const fixture = create();
            fixture.componentInstance.shift = SHIFT_WITH_NOTE;
            fixture.componentInstance.canManage = false;
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('.btn-edit'))).toBeFalsy();
            expect(fixture.debugElement.query(By.css('.btn-delete'))).toBeFalsy();
            expect(fixture.debugElement.query(By.css('.btn-close'))).toBeTruthy();
        });
    });

    describe('when the shift has no note and canManage is true', () => {
        it('should open directly in edit mode (add-note flow)', () => {
            const fixture = create();
            fixture.componentInstance.canManage = true;
            fixture.componentInstance.shift = SHIFT_WITHOUT_NOTE;
            fixture.componentInstance.ngOnChanges({ shift: {} as any });
            fixture.detectChanges();

            expect(fixture.componentInstance.isEditing).toBeTrue();
            expect(fixture.debugElement.query(By.css('.note-textarea'))).toBeTruthy();
        });

        it('cancelling should close the modal (nothing to fall back to)', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.canManage = true;
            comp.shift = SHIFT_WITHOUT_NOTE;
            comp.ngOnChanges({ shift: {} as any });
            fixture.detectChanges();
            spyOn(comp.closed, 'emit');

            fixture.debugElement.query(By.css('.btn-cancel')).triggerEventHandler('click', null);

            expect(comp.closed.emit).toHaveBeenCalled();
        });
    });

    describe('when the shift has no note and canManage is false', () => {
        it('should render no indicator content at all (parent should not open this for non-managers with no note)', () => {
            const fixture = create();
            fixture.componentInstance.canManage = false;
            fixture.componentInstance.shift = SHIFT_WITHOUT_NOTE;
            fixture.detectChanges();

            expect(fixture.componentInstance.isEditing).toBeFalse();
        });
    });

    describe('editing an existing note', () => {
        it('startEditing() should enter edit mode pre-filled with the current note', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.canManage = true;
            comp.shift = SHIFT_WITH_NOTE;
            fixture.detectChanges();

            comp.startEditing();
            markOwnViewDirty(fixture);
            fixture.detectChanges();

            expect(comp.isEditing).toBeTrue();
            expect(comp.draftNote).toBe(SHIFT_WITH_NOTE.note);
        });

        it('cancelEditing() should return to the view (not close) when a note already existed', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.canManage = true;
            comp.shift = SHIFT_WITH_NOTE;
            fixture.detectChanges();
            spyOn(comp.closed, 'emit');

            comp.startEditing();
            comp.cancelEditing();

            expect(comp.isEditing).toBeFalse();
            expect(comp.closed.emit).not.toHaveBeenCalled();
        });

        it('saveNote() should emit the trimmed draft via noteSaved', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.canManage = true;
            comp.shift = SHIFT_WITH_NOTE;
            fixture.detectChanges();
            spyOn(comp.noteSaved, 'emit');

            comp.draftNote = '  עודכן  ';
            comp.saveNote();

            expect(comp.noteSaved.emit).toHaveBeenCalledWith('עודכן');
        });

        it('saveNote() should not emit for a blank/whitespace-only draft', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.canManage = true;
            comp.shift = SHIFT_WITH_NOTE;
            fixture.detectChanges();
            spyOn(comp.noteSaved, 'emit');

            comp.draftNote = '   ';
            comp.saveNote();

            expect(comp.noteSaved.emit).not.toHaveBeenCalled();
        });

        it('the save button should be disabled while isSaving is true', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.canManage = true;
            comp.shift = SHIFT_WITH_NOTE;
            comp.isSaving = true;
            fixture.detectChanges();
            comp.startEditing();
            markOwnViewDirty(fixture);
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('.btn-save')).nativeElement.disabled).toBeTrue();
        });
    });

    describe('deleting a note', () => {
        it('requestDeleteConfirmation() should swap in the confirm view', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.canManage = true;
            comp.shift = SHIFT_WITH_NOTE;
            fixture.detectChanges();

            comp.requestDeleteConfirmation();
            markOwnViewDirty(fixture);
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('.confirm-delete-message'))).toBeTruthy();
        });

        it('confirmDelete() should emit noteDeleted', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.canManage = true;
            comp.shift = SHIFT_WITH_NOTE;
            fixture.detectChanges();
            spyOn(comp.noteDeleted, 'emit');

            comp.requestDeleteConfirmation();
            comp.confirmDelete();

            expect(comp.noteDeleted.emit).toHaveBeenCalled();
        });

        it('cancelDeleteConfirmation() should return to the view without emitting', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.canManage = true;
            comp.shift = SHIFT_WITH_NOTE;
            fixture.detectChanges();
            spyOn(comp.noteDeleted, 'emit');

            comp.requestDeleteConfirmation();
            comp.cancelDeleteConfirmation();

            expect(comp.isConfirmingDelete).toBeFalse();
            expect(comp.noteDeleted.emit).not.toHaveBeenCalled();
        });
    });

    it('should reset confirm/edit state whenever a new shift is bound', () => {
        const fixture = create();
        const comp = fixture.componentInstance;
        comp.canManage = true;
        comp.shift = SHIFT_WITH_NOTE;
        fixture.detectChanges();
        comp.requestDeleteConfirmation();
        expect(comp.isConfirmingDelete).toBeTrue();

        comp.shift = SHIFT_WITHOUT_NOTE;
        comp.ngOnChanges({ shift: {} as any });

        expect(comp.isConfirmingDelete).toBeFalse();
        expect(comp.isEditing).toBeTrue(); // no note + canManage -> straight to add mode
    });

    it('onClose() should emit closed and reset local state', () => {
        const fixture = create();
        const comp = fixture.componentInstance;
        comp.canManage = true;
        comp.shift = SHIFT_WITH_NOTE;
        fixture.detectChanges();
        comp.startEditing();
        spyOn(comp.closed, 'emit');

        comp.onClose();

        expect(comp.closed.emit).toHaveBeenCalled();
        expect(comp.isEditing).toBeFalse();
        expect(comp.isConfirmingDelete).toBeFalse();
    });

    it('should display a save error message when saveError is set', () => {
        const fixture = create();
        const comp = fixture.componentInstance;
        comp.canManage = true;
        comp.shift = SHIFT_WITH_NOTE;
        comp.saveError = 'שמירת ההערה נכשלה. נסה/י שוב.';
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('.note-error')).nativeElement.textContent).toContain('שמירת ההערה נכשלה');
    });
});

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AssignmentModalComponent } from './assignment-modal.component';
import { User } from '../../services/user-management.service';

describe('AssignmentModalComponent', () => {
    const users: User[] = [
        { id: 1, name: 'שרה מ.', email: 'sara@magen.org', role: 'VOLUNTEER' },
        { id: 2, name: 'רבקה ס.', email: 'rivka@magen.org', role: 'ADMIN' }
    ];

    function setup(overrides: Partial<AssignmentModalComponent> = {}) {
        TestBed.configureTestingModule({ imports: [AssignmentModalComponent] });
        const fixture = TestBed.createComponent(AssignmentModalComponent);
        Object.assign(fixture.componentInstance, { isOpen: true, users }, overrides);
        fixture.detectChanges();
        return fixture;
    }

    it('should create', () => {
        const fixture = setup();
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render nothing when isOpen is false', () => {
        const fixture = setup({ isOpen: false });
        expect(fixture.debugElement.query(By.css('.modal-shell-overlay'))).toBeFalsy();
    });

    it('should list all users when there is no search term', () => {
        const fixture = setup();
        const rows = fixture.debugElement.queryAll(By.css('.user-row'));
        expect(rows.length).toBe(2);
    });

    it('should filter users by name or email as the search term changes', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;

        comp.searchTerm = 'רבקה';
        expect(comp.filteredUsers.length).toBe(1);
        expect(comp.filteredUsers[0].name).toBe('רבקה ס.');

        comp.searchTerm = 'sara@magen.org';
        expect(comp.filteredUsers.length).toBe(1);
        expect(comp.filteredUsers[0].name).toBe('שרה מ.');

        comp.searchTerm = 'no-such-person';
        expect(comp.filteredUsers.length).toBe(0);
    });

    it('should emit selectUser when a user row is clicked', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        spyOn(comp.selectUser, 'emit');

        const firstRow = fixture.debugElement.query(By.css('.user-row'));
        firstRow.triggerEventHandler('click', null);

        expect(comp.selectUser.emit).toHaveBeenCalledWith(users[0]);
    });

    it('should emit closeModal and clear the search term when Cancel is clicked', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        comp.searchTerm = 'something';
        spyOn(comp.closeModal, 'emit');

        fixture.debugElement.query(By.css('.btn-cancel')).triggerEventHandler('click', null);

        expect(comp.closeModal.emit).toHaveBeenCalled();
        expect(comp.searchTerm).toBe('');
    });

    it('should emit closeModal when the backdrop is clicked, but not when the panel itself is clicked', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        spyOn(comp.closeModal, 'emit');

        fixture.debugElement.query(By.css('.modal-shell-panel')).triggerEventHandler('click', { stopPropagation: () => { } });
        expect(comp.closeModal.emit).not.toHaveBeenCalled();

        fixture.debugElement.query(By.css('.modal-shell-overlay')).triggerEventHandler('click', null);
        expect(comp.closeModal.emit).toHaveBeenCalled();
    });

    it('should show a loading state', () => {
        const loadingFixture = setup({ isLoading: true });
        expect(loadingFixture.debugElement.query(By.css('.modal-status')).nativeElement.textContent).toContain('טוען');
    });

    it('should show an error state', () => {
        const errorFixture = setup({ isLoading: false, errorMessage: 'שגיאה כלשהי' });
        const status = errorFixture.debugElement.query(By.css('.modal-status.error'));
        expect(status.nativeElement.textContent).toContain('שגיאה כלשהי');
    });

    describe('current assignment / unassign', () => {
        it('should not show the current-assignment banner when the day is vacant', () => {
            const fixture = setup({ currentVolunteerName: null });
            expect(fixture.debugElement.query(By.css('.current-assignment'))).toBeFalsy();
        });

        it('should show the currently-assigned volunteer name and an unassign button when the day is assigned', () => {
            const fixture = setup({ currentVolunteerName: 'שרה מ.' });
            const banner = fixture.debugElement.query(By.css('.current-assignment'));

            expect(banner).toBeTruthy();
            expect(banner.nativeElement.textContent).toContain('שרה מ.');
            expect(fixture.debugElement.query(By.css('.btn-unassign'))).toBeTruthy();
        });

        it('should emit unassign when the unassign button is clicked', () => {
            const fixture = setup({ currentVolunteerName: 'שרה מ.' });
            const comp = fixture.componentInstance;
            spyOn(comp.unassign, 'emit');

            fixture.debugElement.query(By.css('.btn-unassign')).triggerEventHandler('click', null);

            expect(comp.unassign.emit).toHaveBeenCalled();
        });
    });

    describe('saving / action error state', () => {
        it('should disable cancel, close and unassign while isSaving is true', () => {
            const fixture = setup({ currentVolunteerName: 'שרה מ.', isSaving: true });

            const cancelBtn: HTMLButtonElement = fixture.debugElement.query(By.css('.btn-cancel')).nativeElement;
            const closeBtn: HTMLButtonElement = fixture.debugElement.query(By.css('.modal-close')).nativeElement;
            const unassignBtn: HTMLButtonElement = fixture.debugElement.query(By.css('.btn-unassign')).nativeElement;

            expect(cancelBtn.disabled).toBeTrue();
            expect(closeBtn.disabled).toBeTrue();
            expect(unassignBtn.disabled).toBeTrue();
        });

        it('should show the actionError message when set', () => {
            const fixture = setup({ actionError: 'שיבוץ המתנדב נכשל. נסה/י שוב.' });
            const banner = fixture.debugElement.query(By.css('.action-error'));

            expect(banner).toBeTruthy();
            expect(banner.nativeElement.textContent).toContain('שיבוץ המתנדב נכשל');
        });

        it('should not show an actionError banner by default', () => {
            const fixture = setup();
            expect(fixture.debugElement.query(By.css('.action-error'))).toBeFalsy();
        });
    });
});

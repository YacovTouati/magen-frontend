import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SuccessModalComponent } from './success-modal.component';

describe('SuccessModalComponent', () => {
    function setup(overrides: Partial<SuccessModalComponent> = {}) {
        TestBed.configureTestingModule({ imports: [SuccessModalComponent] });
        const fixture = TestBed.createComponent(SuccessModalComponent);
        Object.assign(fixture.componentInstance, { isOpen: true }, overrides);
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

    it('should display the provided title and message', () => {
        const fixture = setup({ title: 'הדיווח נשמר', message: 'מספר מזהה: 42' });
        const text = fixture.nativeElement.textContent;

        expect(text).toContain('הדיווח נשמר');
        expect(text).toContain('מספר מזהה: 42');
    });

    it('should not render a message paragraph when message is empty', () => {
        const fixture = setup({ message: '' });
        expect(fixture.debugElement.query(By.css('.success-message'))).toBeFalsy();
    });

    it('should emit closed when the primary action button is clicked', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        spyOn(comp.closed, 'emit');

        fixture.debugElement.query(By.css('.btn-primary-action')).triggerEventHandler('click', null);

        expect(comp.closed.emit).toHaveBeenCalled();
    });

    it('should emit closed when the backdrop is clicked', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        spyOn(comp.closed, 'emit');

        fixture.debugElement.query(By.css('.modal-shell-overlay')).triggerEventHandler('click', null);

        expect(comp.closed.emit).toHaveBeenCalled();
    });
});

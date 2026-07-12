import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmModalComponent } from './confirm-modal.component';

describe('ConfirmModalComponent', () => {
    function setup(overrides: Partial<ConfirmModalComponent> = {}) {
        TestBed.configureTestingModule({ imports: [ConfirmModalComponent] });
        const fixture = TestBed.createComponent(ConfirmModalComponent);
        Object.assign(fixture.componentInstance, { isOpen: true, message: 'האם אתה בטוח?' }, overrides);
        fixture.detectChanges();
        return fixture;
    }

    it('should create', () => {
        const fixture = setup();
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render nothing when isOpen is false', () => {
        const fixture = setup({ isOpen: false });
        expect(fixture.debugElement.query(By.css('.confirm-overlay'))).toBeFalsy();
    });

    it('should display the provided message and labels', () => {
        const fixture = setup({ message: 'טקסט בדיקה', confirmLabel: 'כן', cancelLabel: 'לא' });
        const text = fixture.nativeElement.textContent;

        expect(text).toContain('טקסט בדיקה');
        expect(text).toContain('כן');
        expect(text).toContain('לא');
    });

    it('should emit confirmed when the primary action button is clicked', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        spyOn(comp.confirmed, 'emit');

        fixture.debugElement.query(By.css('.btn-primary-action')).triggerEventHandler('click', null);

        expect(comp.confirmed.emit).toHaveBeenCalled();
    });

    it('should emit cancelled when the secondary button is clicked', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        spyOn(comp.cancelled, 'emit');

        fixture.debugElement.query(By.css('.btn-secondary')).triggerEventHandler('click', null);

        expect(comp.cancelled.emit).toHaveBeenCalled();
    });

    it('should emit cancelled when the backdrop is clicked, but not when the panel is clicked', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        spyOn(comp.cancelled, 'emit');

        fixture.debugElement.query(By.css('.confirm-panel')).triggerEventHandler('click', { stopPropagation: () => { } });
        expect(comp.cancelled.emit).not.toHaveBeenCalled();

        fixture.debugElement.query(By.css('.confirm-overlay')).triggerEventHandler('click', null);
        expect(comp.cancelled.emit).toHaveBeenCalled();
    });
});

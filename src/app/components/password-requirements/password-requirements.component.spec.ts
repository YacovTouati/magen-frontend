import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PasswordRequirementsComponent } from './password-requirements.component';

describe('PasswordRequirementsComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [PasswordRequirementsComponent] }).compileComponents();
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(PasswordRequirementsComponent);
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render four requirement rows, none met for an empty password', () => {
        const fixture = TestBed.createComponent(PasswordRequirementsComponent);
        fixture.componentInstance.password = '';
        fixture.detectChanges();

        const items = fixture.debugElement.queryAll(By.css('.password-checklist li'));
        expect(items.length).toBe(4);
        expect(items.every(li => !li.classes['met'])).toBeTrue();
    });

    it('should mark only the satisfied requirements as met', () => {
        const fixture = TestBed.createComponent(PasswordRequirementsComponent);
        fixture.componentInstance.password = 'lowercase123'; // length + digit, no uppercase/special
        fixture.detectChanges();

        const items = fixture.debugElement.queryAll(By.css('.password-checklist li'));
        const metStates = items.map(li => !!li.classes['met']);

        expect(metStates).toEqual([true, false, true, false]);
    });

    it('should mark every requirement as met for a fully valid password', () => {
        const fixture = TestBed.createComponent(PasswordRequirementsComponent);
        fixture.componentInstance.password = 'Str0ng!Pass';
        fixture.detectChanges();

        const items = fixture.debugElement.queryAll(By.css('.password-checklist li'));
        expect(items.every(li => !!li.classes['met'])).toBeTrue();
    });
});

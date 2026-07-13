import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ReportComponent } from './report.component';

describe('ReportComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [ReportComponent] }).compileComponents();
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(ReportComponent);
        const comp = fixture.componentInstance;
        expect(comp).toBeTruthy();
    });

    describe('phone number validation', () => {
        it('the phone input should have maxlength=10 and a 9-10 digit numeric pattern', () => {
            const fixture = TestBed.createComponent(ReportComponent);
            fixture.detectChanges();
            const input: HTMLInputElement = fixture.debugElement.query(By.css('input[name="phone"]')).nativeElement;

            expect(input.maxLength).toBe(10);
            expect(input.getAttribute('pattern')).toBe('^[0-9]{9,10}$');
        });

        it('onlyNumbers() should allow digit keys and block any non-digit key (letters, dash, symbols)', () => {
            const fixture = TestBed.createComponent(ReportComponent);
            const comp = fixture.componentInstance;

            const digitEvent = new KeyboardEvent('keypress', { key: '5', cancelable: true });
            comp.onlyNumbers(digitEvent);
            expect(digitEvent.defaultPrevented).toBeFalse();

            const dashEvent = new KeyboardEvent('keypress', { key: '-', cancelable: true });
            comp.onlyNumbers(dashEvent);
            expect(dashEvent.defaultPrevented).toBeTrue();

            const letterEvent = new KeyboardEvent('keypress', { key: 'a', cancelable: true });
            comp.onlyNumbers(letterEvent);
            expect(letterEvent.defaultPrevented).toBeTrue();
        });

        it('should show the Hebrew error message once the phone field is touched and invalid', async () => {
            const fixture = TestBed.createComponent(ReportComponent);
            fixture.detectChanges();
            await fixture.whenStable(); // template-driven forms register controls via a resolved promise
            fixture.detectChanges();
            const input: HTMLInputElement = fixture.debugElement.query(By.css('input[name="phone"]')).nativeElement;

            input.value = '12345'; // too short — fails the 9-10 digit pattern
            input.dispatchEvent(new Event('input'));
            input.dispatchEvent(new Event('blur'));
            fixture.detectChanges();

            const error = fixture.debugElement.query(By.css('.field-error'));
            expect(error).toBeTruthy();
            expect(error.nativeElement.textContent).toContain('בין 9 ל-10 ספרות');
        });

        it('should NOT show an error once a valid 10-digit phone number is entered', async () => {
            const fixture = TestBed.createComponent(ReportComponent);
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
            const input: HTMLInputElement = fixture.debugElement.query(By.css('input[name="phone"]')).nativeElement;

            input.value = '0501234567';
            input.dispatchEvent(new Event('input'));
            input.dispatchEvent(new Event('blur'));
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('.field-error'))).toBeFalsy();
        });

        it('the submit button should be disabled while the phone number is invalid, and enabled once the whole form is valid', async () => {
            const fixture = TestBed.createComponent(ReportComponent);
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();

            const nameInput: HTMLInputElement = fixture.debugElement.query(By.css('input[name="callerName"]')).nativeElement;
            const phoneInput: HTMLInputElement = fixture.debugElement.query(By.css('input[name="phone"]')).nativeElement;
            const summary: HTMLTextAreaElement = fixture.debugElement.query(By.css('textarea[name="summaryNotes"]')).nativeElement;
            const submitBtn: HTMLButtonElement = fixture.debugElement.query(By.css('.submit-btn')).nativeElement;

            expect(submitBtn.disabled).toBeTrue(); // nothing filled in yet

            nameInput.value = 'ישראל ישראלי';
            nameInput.dispatchEvent(new Event('input'));
            phoneInput.value = '12345'; // invalid — too short
            phoneInput.dispatchEvent(new Event('input'));
            summary.value = 'תקציר שיחה לדוגמה';
            summary.dispatchEvent(new Event('input'));
            fixture.detectChanges();

            expect(submitBtn.disabled).toBeTrue();

            phoneInput.value = '0501234567'; // now valid
            phoneInput.dispatchEvent(new Event('input'));
            fixture.detectChanges();

            expect(submitBtn.disabled).toBeFalse();
        });

        it('onSubmit() should not emit when the phone number fails the 9-10 digit pattern, even if called directly', () => {
            const fixture = TestBed.createComponent(ReportComponent);
            const comp = fixture.componentInstance;
            spyOn(comp.reportSubmit, 'emit');
            comp.phone = '123';

            comp.onSubmit();

            expect(comp.reportSubmit.emit).not.toHaveBeenCalled();
        });

        it('onSubmit() should emit the report payload for a valid 10-digit mobile number', () => {
            const fixture = TestBed.createComponent(ReportComponent);
            const comp = fixture.componentInstance;
            spyOn(comp.reportSubmit, 'emit');
            comp.phone = '0501234567';

            comp.onSubmit();

            expect(comp.reportSubmit.emit).toHaveBeenCalled();
        });

        it('onSubmit() should also accept a valid 9-digit landline number', () => {
            const fixture = TestBed.createComponent(ReportComponent);
            const comp = fixture.componentInstance;
            spyOn(comp.reportSubmit, 'emit');
            comp.phone = '021234567'; // 9 digits

            comp.onSubmit();

            expect(comp.reportSubmit.emit).toHaveBeenCalled();
        });
    });
});

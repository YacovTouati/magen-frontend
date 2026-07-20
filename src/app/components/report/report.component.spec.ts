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
        it('the phone input should have maxlength=10 and a 7-10 digit numeric pattern', () => {
            const fixture = TestBed.createComponent(ReportComponent);
            fixture.detectChanges();
            const input: HTMLInputElement = fixture.debugElement.query(By.css('input[name="phone"]')).nativeElement;

            expect(input.maxLength).toBe(10);
            expect(input.getAttribute('pattern')).toBe('^[0-9]{7,10}$');
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
            expect(error.nativeElement.textContent).toContain('בין 7 ל-10 ספרות');
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
            const regionInput: HTMLInputElement = fixture.debugElement.query(By.css('input[name="region"]')).nativeElement;
            const summary: HTMLTextAreaElement = fixture.debugElement.query(By.css('textarea[name="summaryNotes"]')).nativeElement;
            const submitBtn: HTMLButtonElement = fixture.debugElement.query(By.css('.submit-btn')).nativeElement;

            expect(submitBtn.disabled).toBeTrue(); // nothing filled in yet

            nameInput.value = 'ישראל ישראלי';
            nameInput.dispatchEvent(new Event('input'));
            phoneInput.value = '12345'; // invalid — too short
            phoneInput.dispatchEvent(new Event('input'));
            regionInput.value = 'מרכז';
            regionInput.dispatchEvent(new Event('input'));
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

        it('onSubmit() should accept the new 7-digit minimum, matching the backend PHONE_PATTERN', () => {
            const fixture = TestBed.createComponent(ReportComponent);
            const comp = fixture.componentInstance;
            spyOn(comp.reportSubmit, 'emit');
            comp.phone = '1234567'; // 7 digits — the new floor

            comp.onSubmit();

            expect(comp.reportSubmit.emit).toHaveBeenCalled();
        });

        it('onSubmit() should reject a 6-digit number, one below the new floor', () => {
            const fixture = TestBed.createComponent(ReportComponent);
            const comp = fixture.componentInstance;
            spyOn(comp.reportSubmit, 'emit');
            comp.phone = '123456'; // 6 digits

            comp.onSubmit();

            expect(comp.reportSubmit.emit).not.toHaveBeenCalled();
        });
    });

    describe('region field (free text)', () => {
        it('region should render as a free-text input, not a <select>', () => {
            const fixture = TestBed.createComponent(ReportComponent);
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('select[name="region"]'))).toBeFalsy();
            const input: HTMLInputElement = fixture.debugElement.query(By.css('input[name="region"]')).nativeElement;
            expect(input.type).toBe('text');
        });
    });

    describe('email field (optional)', () => {
        it('the email input should not be marked required', () => {
            const fixture = TestBed.createComponent(ReportComponent);
            fixture.detectChanges();
            const input: HTMLInputElement = fixture.debugElement.query(By.css('input[name="email"]')).nativeElement;

            expect(input.required).toBeFalse();
        });

        it('onSubmit() should emit successfully with an empty email', () => {
            const fixture = TestBed.createComponent(ReportComponent);
            const comp = fixture.componentInstance;
            spyOn(comp.reportSubmit, 'emit');
            comp.phone = '0501234567';
            comp.email = '';

            comp.onSubmit();

            expect(comp.reportSubmit.emit).toHaveBeenCalled();
        });
    });

    describe('new demographic questions', () => {
        it('onSubmit() payload should include the renamed and new fields', () => {
            const fixture = TestBed.createComponent(ReportComponent);
            const comp = fixture.componentInstance;
            let emitted: any = null;
            comp.reportSubmit.subscribe((v: any) => emitted = v);
            comp.phone = '0501234567';
            comp.receivedSupportAtOtherCenter = true;
            comp.isFamilyMemberOrAcquaintance = true;
            comp.magenContactHistory = 'past';

            comp.onSubmit();

            expect(emitted.receivedSupportAtOtherCenter).toBeTrue();
            expect(emitted.isFamilyMemberOrAcquaintance).toBeTrue();
            expect(emitted.magenContactHistory).toBe('past');
            expect(emitted.contactedOtherCenterBefore).toBeUndefined();
        });
    });
});

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SamplesComponent } from './samples.component';

describe('SamplesComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [SamplesComponent] }).compileComponents();
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(SamplesComponent);
        const comp = fixture.componentInstance;
        expect(comp).toBeTruthy();
    });

    describe('step navigation', () => {
        it('should default to step 1 with only step 1 marked visited', () => {
            const fixture = TestBed.createComponent(SamplesComponent);
            const comp = fixture.componentInstance;

            expect(comp.currentStep).toBe(1);
            expect(comp.isStepVisited(1)).toBeTrue();
            expect(comp.visitedCount).toBe(1);
        });

        it('goToStep() should jump to any step directly, out of order, and mark it visited', () => {
            const fixture = TestBed.createComponent(SamplesComponent);
            const comp = fixture.componentInstance;

            comp.goToStep(9);

            expect(comp.currentStep).toBe(9);
            expect(comp.isStepVisited(9)).toBeTrue();
            expect(comp.visitedCount).toBe(2); // step 1 (initial) + step 9
        });

        it('revisiting an already-visited step should not double count it', () => {
            const fixture = TestBed.createComponent(SamplesComponent);
            const comp = fixture.componentInstance;

            comp.goToStep(3);
            comp.goToStep(1);
            comp.goToStep(3);

            expect(comp.visitedCount).toBe(2); // just steps 1 and 3
        });

        it('should render all 9 step buttons in the sidebar', () => {
            const fixture = TestBed.createComponent(SamplesComponent);
            fixture.detectChanges();

            expect(fixture.debugElement.queryAll(By.css('.step-nav-btn')).length).toBe(9);
        });

        it('clicking a sidebar step button should switch the visible panel', () => {
            const fixture = TestBed.createComponent(SamplesComponent);
            fixture.detectChanges();

            const buttons = fixture.debugElement.queryAll(By.css('.step-nav-btn'));
            buttons[8].triggerEventHandler('click', null); // step 9
            fixture.detectChanges();

            expect(fixture.componentInstance.currentStep).toBe(9);
            const panels = fixture.debugElement.queryAll(By.css('.step-panel'));
            expect(panels[8].nativeElement.hidden).toBeFalse();
            expect(panels[0].nativeElement.hidden).toBeTrue();
        });

        it('the emergency banner should always be visible regardless of the current step', () => {
            const fixture = TestBed.createComponent(SamplesComponent);
            fixture.detectChanges();

            fixture.componentInstance.goToStep(7);
            fixture.detectChanges();

            const banner = fixture.debugElement.query(By.css('.emergency-banner'));
            expect(banner).toBeTruthy();
            expect(banner.nativeElement.textContent).toContain('100');
        });

        it('clicking the emergency banner button should jump straight to step 3', () => {
            const fixture = TestBed.createComponent(SamplesComponent);
            fixture.detectChanges();
            fixture.componentInstance.goToStep(6);
            fixture.detectChanges();

            fixture.debugElement.query(By.css('.emergency-banner-btn')).triggerEventHandler('click', null);

            expect(fixture.componentInstance.currentStep).toBe(3);
        });
    });

    describe('reference checklist (local UI state only)', () => {
        it('toggleCheck()/isChecked() should flip independently per key', () => {
            const fixture = TestBed.createComponent(SamplesComponent);
            const comp = fixture.componentInstance;

            expect(comp.isChecked('s1-intro')).toBeFalse();

            comp.toggleCheck('s1-intro');
            expect(comp.isChecked('s1-intro')).toBeTrue();
            expect(comp.isChecked('s1-anon')).toBeFalse();

            comp.toggleCheck('s1-intro');
            expect(comp.isChecked('s1-intro')).toBeFalse();
        });

        it('checking a step-9 checklist box should toggle its rendered checkbox', () => {
            const fixture = TestBed.createComponent(SamplesComponent);
            fixture.detectChanges();
            fixture.componentInstance.goToStep(9);
            fixture.detectChanges();

            const checkbox: HTMLInputElement = fixture.debugElement.queryAll(By.css('.step-panel'))[8]
                .query(By.css('input[type="checkbox"]')).nativeElement;

            expect(checkbox.checked).toBeFalse();
            checkbox.click();
            fixture.detectChanges();

            expect(checkbox.checked).toBeTrue();
        });
    });

    describe('identity selection (steps 2, 5 & 6)', () => {
        it('should have no identity selected by default', () => {
            const fixture = TestBed.createComponent(SamplesComponent);
            expect(fixture.componentInstance.selectedIdentity).toBeNull();
        });

        it('selectIdentity() should set the selected column', () => {
            const fixture = TestBed.createComponent(SamplesComponent);
            const comp = fixture.componentInstance;

            comp.selectIdentity('family');

            expect(comp.selectedIdentity).toBe('family');
        });

        it('clicking an identity chip in step 2 should highlight the matching card in steps 5 and 6', () => {
            const fixture = TestBed.createComponent(SamplesComponent);
            fixture.detectChanges();

            const chips = fixture.debugElement.queryAll(By.css('.identity-chip'));
            chips[1].triggerEventHandler('click', null); // 'בן משפחה של הנפגע/ת' -> family
            fixture.detectChanges();

            expect(fixture.componentInstance.selectedIdentity).toBe('family');

            fixture.componentInstance.goToStep(5);
            fixture.detectChanges();
            const step5Cards = fixture.debugElement.queryAll(By.css('.step-panel'))[4].queryAll(By.css('.identity-card'));
            expect(step5Cards[1].nativeElement.classList).toContain('highlight');
            expect(step5Cards[0].nativeElement.classList).not.toContain('highlight');

            fixture.componentInstance.goToStep(6);
            fixture.detectChanges();
            const step6Cards = fixture.debugElement.queryAll(By.css('.step-panel'))[5].queryAll(By.css('.identity-card'));
            expect(step6Cards[1].nativeElement.classList).toContain('highlight');
        });
    });
});

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { ModalShellComponent } from './modal-shell.component';

@Component({
    standalone: true,
    imports: [ModalShellComponent],
    template: `
        <app-modal-shell [isOpen]="isOpen" [maxWidth]="maxWidth" (backdropClick)="onBackdropClick()">
            <p class="projected-content">hello</p>
        </app-modal-shell>
    `
})
class HostComponent {
    isOpen = true;
    maxWidth = '400px';
    backdropClickCount = 0;

    onBackdropClick(): void {
        this.backdropClickCount++;
    }
}

describe('ModalShellComponent', () => {
    function setup() {
        TestBed.configureTestingModule({ imports: [HostComponent] });
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        return fixture;
    }

    it('should render projected content when open', () => {
        const fixture = setup();
        expect(fixture.debugElement.query(By.css('.projected-content'))).toBeTruthy();
        expect(fixture.debugElement.query(By.css('.modal-shell-overlay'))).toBeTruthy();
    });

    it('should render nothing when isOpen is false', () => {
        const fixture = setup();
        fixture.componentInstance.isOpen = false;
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('.modal-shell-overlay'))).toBeFalsy();
    });

    it('should apply the given maxWidth to the panel', () => {
        const fixture = setup();
        const panel = fixture.debugElement.query(By.css('.modal-shell-panel')).nativeElement;
        expect(panel.style.maxWidth).toBe('400px');
    });

    it('should emit backdropClick when the overlay is clicked directly', () => {
        const fixture = setup();

        fixture.debugElement.query(By.css('.modal-shell-overlay')).triggerEventHandler('click', null);

        expect(fixture.componentInstance.backdropClickCount).toBe(1);
    });

    it('should NOT emit backdropClick when the panel itself is clicked (stopPropagation)', () => {
        const fixture = setup();

        fixture.debugElement.query(By.css('.modal-shell-panel')).triggerEventHandler('click', { stopPropagation: () => { } });

        expect(fixture.componentInstance.backdropClickCount).toBe(0);
    });
});

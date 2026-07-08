import { TestBed } from '@angular/core/testing';
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
});

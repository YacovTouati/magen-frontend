import { TestBed } from '@angular/core/testing';
import { FutureComponent } from './future.component';

describe('FutureComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [FutureComponent] }).compileComponents();
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(FutureComponent);
        const comp = fixture.componentInstance;
        expect(comp).toBeTruthy();
    });
});

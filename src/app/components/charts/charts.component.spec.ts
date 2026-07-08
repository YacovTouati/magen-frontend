import { TestBed } from '@angular/core/testing';
import { ChartsComponent } from './charts.component';

describe('ChartsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ChartsComponent] }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ChartsComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
  });
});

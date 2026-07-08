import { TestBed } from '@angular/core/testing';
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
});

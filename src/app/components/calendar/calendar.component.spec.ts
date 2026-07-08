import { TestBed } from '@angular/core/testing';
import { CalendarComponent } from './calendar.component';

describe('CalendarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CalendarComponent] }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CalendarComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [SidebarComponent, RouterTestingModule] }).compileComponents();
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        const comp = fixture.componentInstance;
        expect(comp).toBeTruthy();
    });
});

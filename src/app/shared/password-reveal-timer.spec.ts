import { fakeAsync, tick } from '@angular/core/testing';
import { PASSWORD_AUTO_HIDE_MS, PasswordRevealTimer } from './password-reveal-timer';

describe('PasswordRevealTimer', () => {
    it('should default to a 30 second (30000ms) auto-hide duration', () => {
        expect(PASSWORD_AUTO_HIDE_MS).toBe(30000);
    });

    it('should call onAutoHide after the duration elapses', fakeAsync(() => {
        let hidden = false;
        const timer = new PasswordRevealTimer(() => hidden = true);

        timer.start();
        expect(hidden).toBeFalse();

        tick(30000);
        expect(hidden).toBeTrue();
    }));

    it('should not fire early', fakeAsync(() => {
        let hidden = false;
        const timer = new PasswordRevealTimer(() => hidden = true);

        timer.start();
        tick(29999);

        expect(hidden).toBeFalse();
        timer.clear(); // drain the still-pending one-shot timeout so fakeAsync doesn't flag it
    }));

    it('clear() before the duration elapses should cancel the auto-hide', fakeAsync(() => {
        let hidden = false;
        const timer = new PasswordRevealTimer(() => hidden = true);

        timer.start();
        tick(15000);
        timer.clear();
        tick(30000);

        expect(hidden).toBeFalse();
    }));

    it('calling start() again should restart the countdown from zero, not stack a second timer', fakeAsync(() => {
        let callCount = 0;
        const timer = new PasswordRevealTimer(() => callCount++);

        timer.start();
        tick(20000);
        timer.start(); // re-reveal — countdown restarts
        tick(20000); // 40s since the first start(), but only 20s since the second

        expect(callCount).toBe(0);

        tick(10000); // now 30s since the second start()
        expect(callCount).toBe(1);
    }));

    it('should respect a custom duration when provided', fakeAsync(() => {
        let hidden = false;
        const timer = new PasswordRevealTimer(() => hidden = true, 5000);

        timer.start();
        tick(4999);
        expect(hidden).toBeFalse();

        tick(1);
        expect(hidden).toBeTrue();
    }));

    it('clear() should be a safe no-op when no timer is pending', () => {
        const timer = new PasswordRevealTimer(() => { });
        expect(() => timer.clear()).not.toThrow();
    });
});

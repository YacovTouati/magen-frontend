// Security UX: a revealed password shouldn't stay in plain text on screen indefinitely
// (shoulder-surfing risk) — auto-hides itself after PASSWORD_AUTO_HIDE_MS unless the user
// hides it manually first. One instance per password field — a component with more than
// one (e.g. RegisterComponent's password + confirmPassword) needs one each, since each
// field's reveal state and countdown are independent of the other's.
export const PASSWORD_AUTO_HIDE_MS = 30000;

export class PasswordRevealTimer {
    private timeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private readonly onAutoHide: () => void,
        private readonly durationMs: number = PASSWORD_AUTO_HIDE_MS
    ) { }

    /** Call when the password becomes visible — (re)starts the auto-hide countdown. */
    start(): void {
        this.clear();
        this.timeoutId = setTimeout(() => {
            this.timeoutId = null;
            this.onAutoHide();
        }, this.durationMs);
    }

    /** Call when the password is hidden manually (before the timer fires) or the owning
     *  component is destroyed — cancels any pending auto-hide. */
    clear(): void {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
}

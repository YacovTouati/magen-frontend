// Mirrors the backend's STRONG_PASSWORD_PATTERN exactly (magen-backend src/middlewares/
// validators.ts) — keep both in sync if the policy ever changes.
export interface PasswordRequirement {
    key: string;
    label: string;
    test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
    { key: 'length', label: 'לפחות 8 תווים', test: (p) => p.length >= 8 },
    { key: 'uppercase', label: 'אות גדולה אחת לפחות (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { key: 'digit', label: 'ספרה אחת לפחות (0-9)', test: (p) => /\d/.test(p) },
    { key: 'special', label: 'תו מיוחד אחד לפחות (למשל !@#$%)', test: (p) => /[^A-Za-z0-9]/.test(p) }
];

export function isPasswordValid(password: string): boolean {
    return PASSWORD_REQUIREMENTS.every(req => req.test(password));
}

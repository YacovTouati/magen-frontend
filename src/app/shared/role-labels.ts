export type UserRole = 'SUPER_ADMIN' | 'INTAKE_ADMIN' | 'SCHEDULER_ADMIN' | 'VOLUNTEER';

export interface RoleOption {
    value: UserRole;
    label: string;
}

// Mirrors the backend's UserRole enum (prisma/schema.prisma, commit b0a364b) — SUPER_ADMIN
// replaced the old flat ADMIN role as the full-access superset, plus two scoped admin types.
export const ROLE_OPTIONS: RoleOption[] = [
    { value: 'SUPER_ADMIN', label: 'מנהל/ת-על' },
    { value: 'INTAKE_ADMIN', label: 'מנהל/ת אינטייק' },
    { value: 'SCHEDULER_ADMIN', label: 'מנהל/ת שיבוץ' },
    { value: 'VOLUNTEER', label: 'מתנדב/ת' }
];

const ROLE_LABEL_MAP: Record<string, string> = Object.fromEntries(
    ROLE_OPTIONS.map(option => [option.value, option.label])
);

const KNOWN_ROLES = new Set<string>(ROLE_OPTIONS.map(option => option.value));

export function getRoleLabel(role: string | null | undefined): string {
    if (!role) {
        return 'לא ידוע';
    }

    return ROLE_LABEL_MAP[role] ?? role;
}

/**
 * Normalizes a raw role value from the backend/localStorage into one of the four known
 * UserRole values. Maps the legacy flat 'ADMIN' role (pre-b0a364b) to SUPER_ADMIN — its
 * closest equivalent — rather than silently downgrading it to VOLUNTEER, since a session
 * cached before the role split still carries 'ADMIN' until its holder re-logs in.
 */
export function normalizeRole(role: unknown): UserRole {
    const normalized = String(role ?? '').trim().toUpperCase();

    if (normalized === 'ADMIN') {
        return 'SUPER_ADMIN';
    }

    return KNOWN_ROLES.has(normalized) ? (normalized as UserRole) : 'VOLUNTEER';
}

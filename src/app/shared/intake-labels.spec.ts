import { getCallerTypeLabel, getMagenContactHistoryLabel, getStatusLabel, getUrgencyLabel, getYesNoLabel } from './intake-labels';

describe('intake-labels', () => {
    describe('getUrgencyLabel', () => {
        it('should map every known urgency to its Hebrew label', () => {
            expect(getUrgencyLabel('CRITICAL')).toBe('קריטית');
            expect(getUrgencyLabel('HIGH')).toBe('גבוהה');
            expect(getUrgencyLabel('MEDIUM')).toBe('בינונית');
            expect(getUrgencyLabel('LOW')).toBe('נמוכה');
        });

        it('should return a placeholder for a missing urgency', () => {
            expect(getUrgencyLabel(null)).toBe('—');
            expect(getUrgencyLabel(undefined)).toBe('—');
        });
    });

    describe('getStatusLabel', () => {
        it('should map every known status to its Hebrew label', () => {
            expect(getStatusLabel('NEW')).toBe('חדש');
            expect(getStatusLabel('NO_ANSWER')).toBe('לא ענה - לנסות שוב');
            expect(getStatusLabel('ACTIVE')).toBe('בטיפול פעיל');
            expect(getStatusLabel('CLOSED')).toBe('נסגר בשיחה קצרה');
            expect(getStatusLabel('LONG_TERM')).toBe('המשך לטיפול ארוך');
        });
    });

    describe('getCallerTypeLabel', () => {
        it('should map every known caller type to its Hebrew label, matching report.component.ts\'s <select> options', () => {
            expect(getCallerTypeLabel('victim')).toBe('נפגע/ת ישיר/ה');
            expect(getCallerTypeLabel('family')).toBe('בן/בת משפחה');
            expect(getCallerTypeLabel('friend')).toBe('חבר/ה או מכר/ה');
            expect(getCallerTypeLabel('unknown')).toBe('אנונימי');
        });

        it('should show a dash for a missing value', () => {
            expect(getCallerTypeLabel(null)).toBe('-');
            expect(getCallerTypeLabel(undefined)).toBe('-');
            expect(getCallerTypeLabel('')).toBe('-');
        });

        it('should fall back to the raw value for an unrecognized string rather than hiding it', () => {
            expect(getCallerTypeLabel('something_new')).toBe('something_new');
        });
    });

    describe('getMagenContactHistoryLabel', () => {
        it('should map every known value to its Hebrew label', () => {
            expect(getMagenContactHistoryLabel('first_time')).toBe('פעם ראשונה');
            expect(getMagenContactHistoryLabel('past')).toBe('פנה בעבר');
            expect(getMagenContactHistoryLabel('dont_remember')).toBe('לא ידוע');
        });

        it('should show a dash for a missing value', () => {
            expect(getMagenContactHistoryLabel(null)).toBe('-');
        });
    });

    describe('getYesNoLabel', () => {
        it('should map true/false to כן/לא', () => {
            expect(getYesNoLabel(true)).toBe('כן');
            expect(getYesNoLabel(false)).toBe('לא');
        });

        it('should show a dash for null/undefined rather than defaulting to "לא"', () => {
            expect(getYesNoLabel(null)).toBe('-');
            expect(getYesNoLabel(undefined)).toBe('-');
        });
    });
});

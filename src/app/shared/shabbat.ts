import { ShiftType } from '../services/schedule.service';

// Organizational policy: no volunteer shift during Shabbat. Friday's EVENING shift
// (candle-lighting/כניסת שבת) and Saturday's MORNING shift are blocked outright;
// Saturday EVENING (after הבדלה) stays a normal, assignable shift. Pure function of
// the shift's own date/type — mirrors the backend's identical rule in
// src/utils/shabbat.ts (magen-backend), so the UI and the server never disagree.
//
// ShiftRecord.date is a plain "YYYY-MM-DD" string (see schedule.service.ts's
// toDateOnly) — new Date('YYYY-MM-DD') parses as UTC midnight per spec, matching how
// the backend stores/derives the weekday, so getUTCDay() here is timezone-safe.
export function isShabbatBlockedShift(date: string, type: ShiftType): boolean {
    const weekday = new Date(date).getUTCDay(); // 0=Sunday ... 5=Friday, 6=Saturday
    return (weekday === 5 && type === 'EVENING') || (weekday === 6 && type === 'MORNING');
}

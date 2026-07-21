import { HttpErrorResponse } from '@angular/common/http';
import { extractServerErrorMessage } from './http-error';

describe('extractServerErrorMessage', () => {
    it('should return a connectivity message for status 0 (request never reached the server)', () => {
        const error = new HttpErrorResponse({ status: 0 });
        expect(extractServerErrorMessage(error, 'fallback')).toBe('לא ניתן להתחבר לשרת. בדוק/י את החיבור לאינטרנט ונסה/י שוב.');
    });

    it('should prefer the first structured validation error message', () => {
        const error = new HttpErrorResponse({
            status: 400,
            error: { success: false, errors: [{ field: 'email', message: 'כתובת המייל שהוזנה אינה תקינה' }] }
        });
        expect(extractServerErrorMessage(error, 'fallback')).toBe('כתובת המייל שהוזנה אינה תקינה');
    });

    it('should fall back to error.error.message when there is no errors array', () => {
        const error = new HttpErrorResponse({
            status: 403,
            error: { success: false, message: 'תוקף ההזמנה פג — יש לבקש הזמנה חדשה מהמנהל' }
        });
        expect(extractServerErrorMessage(error, 'fallback')).toBe('תוקף ההזמנה פג — יש לבקש הזמנה חדשה מהמנהל');
    });

    it('should use the caller-supplied fallback when the error has neither shape', () => {
        const error = new HttpErrorResponse({ status: 500, error: {} });
        expect(extractServerErrorMessage(error, 'ברירת מחדל')).toBe('ברירת מחדל');
    });
});

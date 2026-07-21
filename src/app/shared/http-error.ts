import { HttpErrorResponse } from '@angular/common/http';

// Field-validation failures (400) come back as { success: false, errors: [{ field, message }] };
// business-rule failures (401/403/404/409) come back as { success: false, message } instead —
// this checks both shapes before falling back to a generic caller-supplied message. status 0
// means the request never reached the server (offline / CORS / server down).
export function extractServerErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error?.status === 0) {
        return 'לא ניתן להתחבר לשרת. בדוק/י את החיבור לאינטרנט ונסה/י שוב.';
    }

    const errors = error?.error?.errors;
    if (Array.isArray(errors) && errors.length > 0 && typeof errors[0]?.message === 'string') {
        return errors[0].message;
    }

    const message = error?.error?.message;
    if (typeof message === 'string' && message) {
        return message;
    }

    return fallback;
}

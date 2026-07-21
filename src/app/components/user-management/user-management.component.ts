import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserManagementService, User, InviteResult, PendingInvite } from '../../services/user-management.service';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { ROLE_OPTIONS, UserRole, getRoleLabel } from '../../shared/role-labels';
import { extractServerErrorMessage } from '../../shared/http-error';

// Hoisted to module scope, same reasoning as IntakeAlertsComponent's DATE_TIME_FORMATTER —
// constructing Intl.DateTimeFormat is comparatively expensive and shouldn't happen per row
// per change-detection cycle.
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

@Component({
    selector: 'app-user-management',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmModalComponent],
    templateUrl: './user-management.component.html',
    styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
    readonly roleOptions = ROLE_OPTIONS;

    users: User[] = [];
    isLoading = false;
    formError = '';
    formSuccess = '';

    inviteEmail = '';
    inviteRole: UserRole = 'VOLUNTEER';
    isInviting = false;

    pendingInvites: PendingInvite[] = [];
    isLoadingInvites = false;

    // Populated only right after a successful invite/re-invite — the raw registration
    // token can never be retrieved again afterward (the backend only ever stores its
    // hash), so this is the admin's one chance to copy the link before it's gone.
    lastInvite: InviteResult | null = null;
    linkCopied = false;

    private pendingDeleteId: number | string | null = null;
    pendingDeleteName = '';

    /** id of the user with an in-flight role-change request, if any */
    pendingRoleChangeId: number | string | null = null;

    /** email of the invite with an in-flight re-invite request, if any */
    pendingReinviteEmail: string | null = null;

    constructor(private userService: UserManagementService) { }

    ngOnInit(): void {
        this.loadUsers();
        this.loadInvitations();
    }

    getRoleLabel(role: string | undefined): string {
        return getRoleLabel(role);
    }

    formatDate(date: string | Date): string {
        return DATE_TIME_FORMATTER.format(new Date(date));
    }

    registrationLink(invite: { email: string; registrationToken: string }): string {
        const params = new URLSearchParams({ token: invite.registrationToken, email: invite.email });
        return `${window.location.origin}/register?${params.toString()}`;
    }

    isPendingRoleChange(user: User): boolean {
        return user.id !== undefined && this.pendingRoleChangeId === user.id;
    }

    // Pessimistic update, same convention as IntakeAlertsComponent's status <select>:
    // user.role only changes once the server confirms it, so the one-way [ngModel]
    // binding naturally snaps back to the current value on its own if this fails.
    onRoleChange(user: User, newRole: string): void {
        if (!user.id || this.pendingRoleChangeId !== null) {
            return;
        }

        this.pendingRoleChangeId = user.id;
        this.formError = '';
        this.formSuccess = '';

        this.userService.updateUserRole(user.id, newRole as UserRole).subscribe({
            next: (updated) => {
                user.role = updated.role;
                this.pendingRoleChangeId = null;
                this.formSuccess = `התפקיד של ${user.name} עודכן ל${getRoleLabel(updated.role)}.`;
            },
            error: (err: HttpErrorResponse) => {
                this.pendingRoleChangeId = null;
                this.formError = extractServerErrorMessage(err, 'עדכון התפקיד נכשל. נסה שוב.');
            }
        });
    }

    loadUsers(): void {
        this.isLoading = true;
        this.formError = '';
        this.userService.getUsers().subscribe({
            next: (users) => {
                this.users = users;
                this.isLoading = false;
            },
            error: () => {
                this.formError = 'לא ניתן לטעון משתמשים מהשרת כרגע.';
                this.isLoading = false;
            }
        });
    }

    loadInvitations(): void {
        this.isLoadingInvites = true;
        this.userService.listInvitations().subscribe({
            next: (invites) => {
                this.pendingInvites = invites;
                this.isLoadingInvites = false;
            },
            error: () => {
                this.isLoadingInvites = false;
            }
        });
    }

    inviteUser(event?: Event): void {
        event?.preventDefault();
        event?.stopPropagation();

        if (!this.inviteEmail.trim() || this.isInviting) {
            return;
        }

        this.isInviting = true;
        this.formError = '';
        this.formSuccess = '';
        this.lastInvite = null;
        this.linkCopied = false;

        this.userService.inviteUser(this.inviteEmail.trim(), this.inviteRole).subscribe({
            next: (invite) => {
                this.isInviting = false;
                this.lastInvite = invite;
                this.formSuccess = `ההזמנה עבור ${invite.email} נוצרה בהצלחה. יש להעתיק ולשלוח את הקישור למוזמן/ת.`;
                this.inviteEmail = '';
                this.inviteRole = 'VOLUNTEER';
                this.loadInvitations();
            },
            error: (err: HttpErrorResponse) => {
                this.isInviting = false;
                this.formError = extractServerErrorMessage(err, 'שליחת ההזמנה נכשלה. נסה שוב.');
            }
        });
    }

    isPendingReinvite(invite: PendingInvite): boolean {
        return this.pendingReinviteEmail === invite.email;
    }

    // Re-invites the same email/role — the backend upserts the pending row with a fresh
    // token and a renewed 48h expiry (see InviteService.inviteUser), invalidating any
    // earlier link for this address. The only way to get a usable link again once the
    // original copy-paste moment has passed.
    reinvite(invite: PendingInvite): void {
        if (this.pendingReinviteEmail !== null) {
            return;
        }

        this.pendingReinviteEmail = invite.email;
        this.formError = '';
        this.formSuccess = '';
        this.lastInvite = null;
        this.linkCopied = false;

        this.userService.inviteUser(invite.email, invite.role).subscribe({
            next: (updated) => {
                this.pendingReinviteEmail = null;
                this.lastInvite = updated;
                this.formSuccess = `נוצר קישור הזמנה חדש עבור ${updated.email}.`;
                this.loadInvitations();
            },
            error: (err: HttpErrorResponse) => {
                this.pendingReinviteEmail = null;
                this.formError = extractServerErrorMessage(err, 'יצירת קישור חדש נכשלה. נסה שוב.');
            }
        });
    }

    copyInviteLink(invite: { email: string; registrationToken: string }): void {
        const link = this.registrationLink(invite);

        navigator.clipboard.writeText(link).then(
            () => {
                this.linkCopied = true;
            },
            () => {
                this.formError = 'העתקת הקישור נכשלה. יש להעתיק אותו ידנית.';
            }
        );
    }

    deleteUser(user: User): void {
        if (!user.id) {
            return;
        }

        this.pendingDeleteId = user.id;
        this.pendingDeleteName = user.name || 'משתמש זה';
    }

    get isDeleteConfirmOpen(): boolean {
        return this.pendingDeleteId !== null;
    }

    get deleteConfirmMessage(): string {
        return `האם אתה בטוח שברצונך למחוק את ${this.pendingDeleteName}? פעולה זו אינה הפיכה.`;
    }

    onConfirmDelete(): void {
        const id = this.pendingDeleteId;
        this.pendingDeleteId = null;

        if (!id) {
            return;
        }

        this.userService.deleteUser(id).subscribe({
            next: () => {
                this.loadUsers();
            },
            error: () => {
                this.formError = 'מחיקת המשתמש נכשלה. נסה שוב.';
            }
        });
    }

    onCancelDelete(): void {
        this.pendingDeleteId = null;
    }
}

import { Routes } from '@angular/router';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { ShiftBoardComponent } from './components/shift-board/shift-board.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'forgot-password', component: ForgotPasswordComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
    {
        path: '',
        component: DashboardComponent,
        canActivate: [authGuard],
        children: [
            { path: 'admin/users', component: UserManagementComponent, canActivate: [adminGuard] },
            // No extra guard beyond the inherited authGuard — both admins and volunteers
            // use this view; admin-only actions (create/publish/release) are gated inside
            // ShiftBoardComponent itself, same way CalendarComponent gates its own admin UI.
            { path: 'shifts', component: ShiftBoardComponent }
        ]
    },
    { path: '**', redirectTo: '' }
];

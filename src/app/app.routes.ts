import { Routes } from '@angular/router';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { ShiftBoardComponent } from './components/shift-board/shift-board.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
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

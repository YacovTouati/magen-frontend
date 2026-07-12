import { Routes } from '@angular/router';
import { UserManagementComponent } from './components/user-management/user-management.component';
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
            { path: 'admin/users', component: UserManagementComponent, canActivate: [adminGuard] }
        ]
    },
    { path: '**', redirectTo: '' }
];

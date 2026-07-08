import { Routes } from '@angular/router';
import { UserManagementComponent } from './components/user-management/user-management.component';

export const routes: Routes = [
    { path: 'admin/users', component: UserManagementComponent }
];

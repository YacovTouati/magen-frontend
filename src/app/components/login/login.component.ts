import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    @Input() loginEmail = '';
    @Output() login = new EventEmitter<string>();

    onLogin() {
        if (!this.loginEmail) return;
        this.login.emit(this.loginEmail);
    }
}

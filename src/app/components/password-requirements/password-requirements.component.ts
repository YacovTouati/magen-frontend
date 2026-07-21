import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PASSWORD_REQUIREMENTS } from '../../shared/password-policy';

@Component({
    selector: 'app-password-requirements',
    standalone: true,
    imports: [CommonModule],
    template: `
    <ul class="password-checklist">
      <li *ngFor="let req of requirements" [class.met]="req.test(password)">
        <span class="check-icon">{{ req.test(password) ? '✓' : '○' }}</span>
        <span>{{ req.label }}</span>
      </li>
    </ul>
    `,
    styleUrls: ['./password-requirements.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PasswordRequirementsComponent {
    @Input() password = '';
    readonly requirements = PASSWORD_REQUIREMENTS;
}

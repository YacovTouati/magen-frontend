import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CallStep {
  id: number;
  title: string;
  icon: string;
}

// The 9-step live-call guide, mirroring "טופס אינטייק למתנדבת בזמן שיחה בקו החם" (1.9.26)
// verbatim in order — this list drives both the sidebar nav and which panel is shown.
export const CALL_STEPS: CallStep[] = [
  { id: 1, title: 'פתיחה ויצירת קשר', icon: '👋' },
  { id: 2, title: 'מי מתקשר/ת', icon: '🧑‍🤝‍🧑' },
  { id: 3, title: 'סכנה מיידית', icon: '🚨' },
  { id: 4, title: 'ארבעת הצירים', icon: '🧭' },
  { id: 5, title: 'שאלות ממוקדות', icon: '❓' },
  { id: 6, title: 'חשד לפגיעה', icon: '⚠️' },
  { id: 7, title: 'פרטים לתיוק', icon: '📋' },
  { id: 8, title: 'הפניה / המלצה', icon: '🤝' },
  { id: 9, title: 'סיכום וסגירה', icon: '✅' }
];

// Steps 5 & 6 show three PDF columns (נפגע/ת, בן משפחה, איש מקצוע) side by side, always —
// clicking one of step 2's identity chips only highlights the closest-matching column
// rather than hiding the other two, since a volunteer may still want the other angles
// as reference mid-call. This is pure local UI state — this whole component is a
// read-only reference/help tool with no form, no backend call, nothing to submit.
export type IdentityColumn = 'victim' | 'family' | 'professional';

@Component({
  selector: 'app-samples',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './samples.component.html',
  styleUrls: ['./samples.component.css']
})
export class SamplesComponent {
  readonly steps = CALL_STEPS;
  currentStep = 1;
  // Purely a "you've seen this" UI cue (a filled dot in the sidebar) — every step stays
  // reachable in one click regardless of where the volunteer is in the call.
  visitedSteps = new Set<number>([1]);

  selectedIdentity: IdentityColumn | null = null;

  // Reference checklist (the PDF's own ☐ items) — pure on-screen aid for the volunteer
  // to tick off mentally during the call. Local-only, never persisted anywhere.
  private checkedItems = new Set<string>();

  goToStep(stepId: number): void {
    this.currentStep = stepId;
    this.visitedSteps.add(stepId);
  }

  isStepVisited(stepId: number): boolean {
    return this.visitedSteps.has(stepId);
  }

  get visitedCount(): number {
    return this.visitedSteps.size;
  }

  selectIdentity(column: IdentityColumn): void {
    this.selectedIdentity = column;
  }

  toggleCheck(key: string): void {
    if (this.checkedItems.has(key)) {
      this.checkedItems.delete(key);
    } else {
      this.checkedItems.add(key);
    }
  }

  isChecked(key: string): boolean {
    return this.checkedItems.has(key);
  }
}

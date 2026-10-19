import { TestBed } from '@angular/core/testing';

import { FeedbackService } from '../../../services/feedback/feedback.service';
import { ToastHostComponent } from './toast-host.component';

describe('ToastHostComponent', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('apila los toasts y retira cada uno al cumplirse su auto-cierre o al cerrarlo', () => {
    // Given
    const fixture = TestBed.configureTestingModule({ imports: [ToastHostComponent] }).createComponent(ToastHostComponent);
    const feedback = TestBed.inject(FeedbackService);
    const el: HTMLElement = fixture.nativeElement;
    const visibles = () => el.querySelectorAll('.th__toast').length;
    // When
    feedback.toast({ variante: 'exito', mensaje: 'Datos guardados', autoCierreMs: 1000 });
    feedback.toast({ variante: 'error', mensaje: 'No se pudo descargar', autoCierreMs: 5000 });
    fixture.detectChanges();
    // Then
    expect(visibles()).toBe(2);
    expect(el.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo descargar');
    // When
    jest.advanceTimersByTime(1000);
    fixture.detectChanges();
    // Then
    expect(visibles()).toBe(1);
    // When
    (el.querySelector('.th__cerrar') as HTMLButtonElement).click();
    fixture.detectChanges();
    // Then
    expect(visibles()).toBe(0);
  });
});

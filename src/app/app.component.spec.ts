import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create the app', () => {
    // Given / When
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    // Then
    expect(app).toBeTruthy();
  });

  it('should render a router-outlet', () => {
    // Given
    const fixture = TestBed.createComponent(AppComponent);
    // When
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // Then
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
});

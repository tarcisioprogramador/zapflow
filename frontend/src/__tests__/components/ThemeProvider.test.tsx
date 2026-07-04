import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import ThemeProvider from '../../components/ThemeProvider';
import { setMockAppState } from '../mocks';

describe('ThemeProvider', () => {
  it('should set data-theme attribute to dark by default', () => {
    render(<ThemeProvider>content</ThemeProvider>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('should update data-theme when theme changes via mock state', () => {
    const { rerender } = render(<ThemeProvider>content</ThemeProvider>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Toggle the theme using setMockAppState
    setMockAppState({ theme: 'light' });

    rerender(<ThemeProvider>content</ThemeProvider>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('should render children correctly', () => {
    const { getByText } = render(
      <ThemeProvider>
        <div>Child Content</div>
      </ThemeProvider>
    );
    expect(getByText('Child Content')).toBeInTheDocument();
  });
});

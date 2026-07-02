import { useEffect, type ReactNode } from 'react';
import { useAppStore } from '../store';

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Also set color-scheme for native elements
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  }, [theme]);

  return <>{children}</>;
}

'use client'

import { UIProvider } from '@/contexts/UIContext';
import { TaskProvider } from '@/contexts/TaskContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <TaskProvider>
        {children}
      </TaskProvider>
    </UIProvider>
  );
}

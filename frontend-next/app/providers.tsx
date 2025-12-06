'use client'

import { UIProvider } from '@/contexts/UIContext';
import { TaskProvider } from '@/contexts/TaskContext';
import { StopwatchProvider } from '@/contexts/StopwatchContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <TaskProvider>
        <StopwatchProvider>
          {children}
        </StopwatchProvider>
      </TaskProvider>
    </UIProvider>
  );
}

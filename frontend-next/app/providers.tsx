'use client'

import { UIProvider } from '@/contexts/UIContext';
import { TaskProvider } from '@/contexts/TaskContext';
import { StopwatchProvider } from '@/contexts/StopwatchContext';
import MuiThemeBridge from '@/components/MuiThemeBridge';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <MuiThemeBridge>
        <TaskProvider>
          <StopwatchProvider>
            {children}
          </StopwatchProvider>
        </TaskProvider>
      </MuiThemeBridge>
    </UIProvider>
  );
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TimerPhase = 'focus' | 'short_break' | 'long_break';

interface PomodoroState {
  breakEndTime: number | null;
  breakPhase: TimerPhase | null;
  setBreak: (phase: TimerPhase, durationSeconds: number) => void;
  clearBreak: () => void;
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set) => ({
      breakEndTime: null,
      breakPhase: null,
      setBreak: (phase, durationSeconds) =>
        set({
          breakEndTime: Date.now() + durationSeconds * 1000,
          breakPhase: phase,
        }),
      clearBreak: () => set({ breakEndTime: null, breakPhase: null }),
    }),
    {
      name: 'pomodoro-break-storage',
    }
  )
);

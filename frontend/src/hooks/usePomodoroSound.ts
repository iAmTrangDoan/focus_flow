import { useCallback, useEffect } from 'react';

export type PomodoroSessionType = 'WORK' | 'BREAK';

const audioElements: Record<PomodoroSessionType, HTMLAudioElement | null> = {
  WORK: null,
  BREAK: null,
};

let isUnlocked = false;

export function usePomodoroSound() {
  useEffect(() => {
    if (!audioElements.WORK) {
      const workAudio = new Audio('/sounds/pomodoro-work-complete.wav');
      workAudio.preload = 'auto';
      workAudio.volume = 0.75;
      audioElements.WORK = workAudio;
    }

    if (!audioElements.BREAK) {
      const breakAudio = new Audio('/sounds/pomodoro-break-complete.wav');
      breakAudio.preload = 'auto';
      breakAudio.volume = 0.65;
      audioElements.BREAK = breakAudio;
    }
  }, []);

  const unlockAudio = useCallback(() => {
    if (isUnlocked) return;
    isUnlocked = true;

    Object.values(audioElements).forEach((audio) => {
      if (!audio) return;
      const originalVolume = audio.volume;
      try {
        audio.volume = 0;
        const p = audio.play();
        if (p !== undefined) {
          p.then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = originalVolume;
          }).catch(() => {
            audio.volume = originalVolume;
          });
        } else {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = originalVolume;
        }
      } catch {
        audio.volume = originalVolume;
      }
    });
  }, []);

  const playSessionEndSound = useCallback(
    (sessionType: PomodoroSessionType) => {
      const audio = audioElements[sessionType];
      if (!audio) return;

      try {
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch((err) => {
          console.warn('Cannot play pomodoro sound:', err);
        });
      } catch (error) {
        console.warn('Error playing pomodoro sound:', error);
      }
    },
    [],
  );

  return {
    unlockAudio,
    playSessionEndSound,
  };
}
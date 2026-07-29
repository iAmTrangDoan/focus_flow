import { useCallback, useEffect, useRef } from 'react';

export type PomodoroSessionType = 'WORK' | 'BREAK';

type PomodoroAudioMap = Record<PomodoroSessionType, HTMLAudioElement>;

export function usePomodoroSound() {
  const audioRef = useRef<PomodoroAudioMap | null>(null);

  useEffect(() => {
    const workCompleteAudio = new Audio(
      '/sounds/pomodoro-work-complete.wav',
    );

    const breakCompleteAudio = new Audio(
      '/sounds/pomodoro-break-complete.wav',
    );

    workCompleteAudio.preload = 'auto';
    breakCompleteAudio.preload = 'auto';

    workCompleteAudio.volume = 0.75;
    breakCompleteAudio.volume = 0.65;

    audioRef.current = {
      WORK: workCompleteAudio,
      BREAK: breakCompleteAudio,
    };

    return () => {
      Object.values(audioRef.current ?? {}).forEach((audio) => {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      });

      audioRef.current = null;
    };
  }, []);

  /**
   * Gọi hàm này khi người dùng bấm nút bắt đầu Pomodoro.
   * Mục đích là mở quyền phát âm thanh của trình duyệt.
   */
  const unlockAudio = useCallback(async () => {
    const audios = Object.values(audioRef.current ?? {});

    await Promise.all(
      audios.map(async (audio) => {
        const originalVolume = audio.volume;

        try {
          audio.volume = 0;
          audio.currentTime = 0;

          await audio.play();

          audio.pause();
          audio.currentTime = 0;
        } catch {
          // Không chặn luồng bắt đầu Pomodoro nếu trình duyệt từ chối.
        } finally {
          audio.volume = originalVolume;
        }
      }),
    );
  }, []);

  const playSessionEndSound = useCallback(
    async (sessionType: PomodoroSessionType) => {
      const audio = audioRef.current?.[sessionType];

      if (!audio) {
        return;
      }

      try {
        audio.pause();
        audio.currentTime = 0;

        await audio.play();
      } catch (error) {
        console.warn(
          'Trình duyệt không cho phép phát âm thanh Pomodoro:',
          error,
        );
      }
    },
    [],
  );

  return {
    unlockAudio,
    playSessionEndSound,
  };
}
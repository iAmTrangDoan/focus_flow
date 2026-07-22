import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Shuffle } from 'lucide-react';

const TOTAL_SECONDS = 25 * 60;

interface FocusCardProps {
  isDelayed: boolean;
  onReshuffle: () => void;
}

export function FocusCard({ isDelayed, onReshuffle }: FocusCardProps) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (secondsLeft === 0) setRunning(false);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, secondsLeft]);

  const reset = () => { setRunning(false); setSecondsLeft(TOTAL_SECONDS); };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = 1 - secondsLeft / TOTAL_SECONDS;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      className="w-full flex flex-col md:flex-row items-center gap-8 px-8 py-8"
      style={{ background: '#FFFFFF', boxShadow: '0 2px 16px 0 rgba(36,48,36,0.07)', borderRadius: 20 }}
    >
      {/* Circular timer */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: 148, height: 148 }}>
        <svg width={148} height={148} className="absolute inset-0 -rotate-90">
          <circle cx={74} cy={74} r={radius} fill="none" stroke="#DDF3DF" strokeWidth={8} />
          <circle
            cx={74} cy={74} r={radius} fill="none" stroke="#5FAF6E" strokeWidth={8}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="relative flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums" style={{ color: '#243024', letterSpacing: '-0.03em' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="text-xs font-medium mt-0.5" style={{ color: '#5F6E5F' }}>
            {running ? 'focusing' : secondsLeft === TOTAL_SECONDS ? 'ready' : 'paused'}
          </span>
        </div>
      </div>

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#F6D8C7', color: '#C1644C' }}>
            High Priority
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#DCECF8', color: '#4A7FB8' }}>
            Design
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-1.5 leading-tight" style={{ color: '#243024' }}>
          Redesign onboarding flow
        </h2>
        <p className="text-sm mb-5 leading-relaxed" style={{ color: '#5F6E5F' }}>
          Revamp the first-run experience to reduce drop-off. Wireframe screens 1–4, then prototype in Figma.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-95"
            style={{ background: '#5FAF6E', color: '#fff' }}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? 'Pause' : 'Start Focus'}
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{ background: '#F4FAF4', color: '#5F6E5F', border: '1px solid #D4E8D4' }}
          >
            <RotateCcw size={15} />
            Reset
          </button>

          {isDelayed && (
            <button
              onClick={onReshuffle}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-95 ml-auto"
              style={{ background: '#DDF3DF', color: '#4A9459', border: '1px dashed #5FAF6E' }}
            >
              <Shuffle size={15} />
              Smart Re-shuffle
            </button>
          )}
        </div>

        {isDelayed && (
          <p className="mt-3 text-xs" style={{ color: '#5F6E5F' }}>
            Your schedule is running a bit behind — let AI suggest a lighter reorder to get back on track.
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface TimerProps {
  timeLeft: number;
}

const Timer: React.FC<TimerProps> = ({ timeLeft: initialTimeLeft }) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1000) {
          clearInterval(intervalId);
          return 0;
        }
        return prevTime - 1000;
      });
    }, 1000);

    return () => clearInterval(intervalId);
    // Intentionally mount-only: reads the initial timeLeft value once and
    // then counts down internally via the functional setState updater, so
    // the interval isn't torn down and recreated on every tick.
  }, []);

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    return {
      days,
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
    };
  };

  const { days, hours, minutes, seconds } = formatTime(timeLeft);

  return (
    <span className='mb-1 block text-xs font-mono tabular-nums'>
        Time left to join: {days > 0 && <span>{days}d</span>} {hours}h{' '}
        {minutes}m {seconds} s
    </span>
  );
};

export default Timer;

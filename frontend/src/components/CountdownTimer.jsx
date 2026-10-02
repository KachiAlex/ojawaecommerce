import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const CountdownTimer = ({ targetDate, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, total: 0 });
        if (onComplete) onComplete();
        return;
      }

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, total: difference });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  const TimeUnit = ({ value, label }) => (
    <motion.div
      className="flex flex-col items-center"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      key={value}
    >
      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[50px] text-center border border-white/20">
        <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs md:text-sm text-white/80 mt-1 uppercase tracking-wide">
        {label}
      </span>
    </motion.div>
  );

  if (timeLeft.total <= 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-white font-semibold">Sale Ended</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 md:gap-4">
      <span className="text-white/90 text-sm md:text-base font-medium hidden sm:inline">
        Time Left:
      </span>
      <div className="flex items-center gap-2 md:gap-3">
        <TimeUnit value={timeLeft.hours} label="H" />
        <span className="text-white text-xl md:text-2xl font-bold">:</span>
        <TimeUnit value={timeLeft.minutes} label="M" />
        <span className="text-white text-xl md:text-2xl font-bold">:</span>
        <TimeUnit value={timeLeft.seconds} label="S" />
      </div>
    </div>
  );
};

export default CountdownTimer;


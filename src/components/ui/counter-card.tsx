"use client";

import { useEffect, useState } from "react";

interface CounterCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon?: React.ReactNode;
}

export default function CounterCard({
  label,
  value,
  suffix = "",
  icon,
}: CounterCardProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const current = Math.min(Math.round(increment * step), value);
      setDisplay(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="border border-[#1d1c19]/15 bg-[#ffffff] p-6 shadow-sm">
      {icon && <div className="text-[#84827a] mb-3">{icon}</div>}
      <p className="font-gt-mono text-3xl font-normal tracking-tight text-[#1d1c19]">
        {display.toLocaleString("id-ID")}
        {suffix && (
          <span className="ml-1 text-xs font-bold text-[#015186]">
            {suffix}
          </span>
        )}
      </p>
      <p className="mt-1 font-gt-sans text-xs text-[#55534c] uppercase tracking-wider">{label}</p>
    </div>
  );
}

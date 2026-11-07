interface LiveBadgeProps {
  label: string;
}

export default function LiveBadge({ label }: LiveBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 border border-[#015186]/30 bg-[#015186]/10 px-3 py-1 text-[10px] font-gt-mono font-bold tracking-widest uppercase text-[#015186]">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#015186] opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-[#015186]" />
      </span>
      {label}
    </span>
  );
}

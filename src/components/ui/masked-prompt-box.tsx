import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

function seedFromModeId(modeId: string): number {
  let n = 0;
  for (let i = 0; i < modeId.length; i++) n = (n * 31 + modeId.charCodeAt(i)) >>> 0;
  return n;
}

export const MaskedPromptBox = ({
  className,
  modeId = "default",
}: {
  className?: string;
  modeId?: string;
}) => {
  const seed = seedFromModeId(modeId);
  const lineCount = 8 + (seed % 7);
  const gap = 6 + (seed % 5);
  const widths = Array.from({ length: lineCount }, (_, i) => {
    const v = (seed + i * 17) % 100;
    return 40 + (v % 45);
  });

  return (
    <div
      className={cn(
        "relative w-full min-h-[240px] rounded border border-border overflow-hidden select-none",
        "bg-muted/10 dark:bg-muted/15 backdrop-blur-md",
        className
      )}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 flex flex-col p-2.5 pointer-events-none"
        style={{ gap: `${gap}px` }}
      >
        {widths.map((w, i) => (
          <div
            key={i}
            className="h-3 rounded shrink-0 bg-muted-foreground/20 dark:bg-muted-foreground/25 blur-[5px]"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Lock size={14} className="text-muted-foreground/60" strokeWidth={2} />
      </div>
    </div>
  );
};

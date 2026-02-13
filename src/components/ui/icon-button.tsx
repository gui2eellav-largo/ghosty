import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: React.ReactNode;
  "aria-label": string;
  variant?: "ghost" | "danger";
  size?: "sm" | "md";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, variant = "ghost", size = "md", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center justify-center rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20",
          variant === "ghost" &&
            "p-1.5 text-muted-foreground hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
          variant === "danger" &&
            "p-1.5 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10",
          size === "sm" && "[&_svg]:size-3",
          size === "md" && "[&_svg]:size-3.5",
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

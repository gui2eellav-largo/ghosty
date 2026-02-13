import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { useEffect, useRef } from "react";

const DIALOG_TITLE_ID = "settings-modal-title";

const getFocusables = (root: HTMLElement): HTMLElement[] => {
  const selector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(selector));
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function SettingsModal({ isOpen, onClose, children }: SettingsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    previousActiveRef.current = document.activeElement as HTMLElement | null;
    const focusables = getFocusables(dialogRef.current);
    const first = focusables[0];
    if (first) {
      requestAnimationFrame(() => first.focus());
    }
    return () => {
      const prev = previousActiveRef.current;
      if (prev && typeof prev.focus === "function") {
        requestAnimationFrame(() => prev.focus());
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const root = dialogRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusables(root);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    root.addEventListener("keydown", handleKeyDown);
    return () => root.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <button
      type="button"
      className={uiClasses.modalOverlay}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      aria-label="Close modal"
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- dialog content: stopPropagation only */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={DIALOG_TITLE_ID}
        className={cn(
          uiClasses.modalContainer,
          "animate-in fade-in zoom-in-95 duration-200"
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className={uiClasses.modalHeader}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-1">
                SETTINGS
              </div>
              <h2
                id={DIALOG_TITLE_ID}
                className="text-2xl font-semibold text-black dark:text-white"
              >
                Preferences
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 transition-colors"
              aria-label="Close settings"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className={uiClasses.modalBody}>{children}</div>
      </div>
    </button>
  );
}

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section>
      <div className={uiClasses.sectionHeader}>
        <h3 className={uiClasses.sectionTitle}>{title}</h3>
        {description && (
          <p className={uiClasses.sectionDescription}>{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-black/[0.06] dark:border-white/[0.06] last:border-0">
      <div className="flex-1">
        <div className="text-sm font-medium text-black dark:text-white">
          {label}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {description}
          </div>
        )}
      </div>
      <div className="ml-4">
        {children}
      </div>
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        uiClasses.toggle,
        checked ? uiClasses.toggleActive : uiClasses.toggleInactive,
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          uiClasses.toggleThumb,
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

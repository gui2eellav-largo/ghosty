import React from "react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { strings } from "@/lib/strings";
import { IconButton } from "@/components/ui/icon-button";
import { SystemPromptEditor } from "@/components/SystemPromptEditor";
import { DEFAULT_SYSTEM_PROMPT_PLACEHOLDER } from "@/hooks/useModes";
import type { ModeConfig } from "@/types";
import { DIRECT_MODE_ID } from "@/types";
import {
  Copy,
  Clipboard,
  Trash2,
  Check,
  X,
  Zap,
  Lock,
} from "lucide-react";

export interface ModeDetailProps {
  mode: ModeConfig;
  modeDraft: Partial<ModeConfig> | null;
  setModeDraft: React.Dispatch<React.SetStateAction<Partial<ModeConfig> | null>>;
  modeIdToConfirmDelete: string | null;
  setModeIdToConfirmDelete: (id: string | null) => void;
  saveModeDraft: (mode: ModeConfig, draft: Partial<ModeConfig>) => Promise<void>;
  handleDeleteMode: (id: string) => Promise<void>;
  handleDuplicateMode: (mode: ModeConfig) => Promise<void>;
  handleExportMode: (mode: ModeConfig) => void;
  setPromptImproveToast: (v: string | null) => void;
  children?: React.ReactNode; // playground slot
}

const ModeDetail = React.memo(function ModeDetail({
  mode,
  modeDraft,
  setModeDraft,
  modeIdToConfirmDelete,
  setModeIdToConfirmDelete,
  saveModeDraft,
  handleDeleteMode,
  handleDuplicateMode,
  handleExportMode,
  setPromptImproveToast,
  children,
}: ModeDetailProps) {
  const d = modeDraft ?? {};
  const display = { ...mode, ...d };
  const canEdit = mode.isCustom;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div
            className="relative shrink-0 rounded-full"
            style={{
              width: 24,
              height: 24,
              minWidth: 24,
              minHeight: 24,
              backgroundColor: display.color,
            }}
          >
            {canEdit && (
              <input
                type="color"
                value={display.color}
                onChange={(e) =>
                  setModeDraft((prev) => ({
                    ...prev,
                    color: e.target.value,
                  }))
                }
                onBlur={() =>
                  modeDraft &&
                  saveModeDraft(mode, {
                    ...modeDraft,
                    color: display.color,
                  })
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
                title="Color"
                aria-label="Color"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {canEdit ? (
                <input
                  value={display.name}
                  onChange={(e) =>
                    setModeDraft((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  onBlur={() =>
                    modeDraft &&
                    saveModeDraft(mode, {
                      ...modeDraft,
                      name: display.name,
                    })
                  }
                  className="text-sm font-medium bg-transparent border-0 border-b border-transparent hover:border-border focus:border-foreground/30 focus:outline-none focus:ring-0 py-0 w-full max-w-md text-foreground leading-tight"
                  placeholder={strings.modes.modeNamePlaceholder}
                />
              ) : (
                <h2 className="text-sm font-medium text-foreground leading-tight">
                  {mode.name}
                </h2>
              )}
              {mode.id === DIRECT_MODE_ID && (
                <span title={strings.modes.directModeTooltip}>
                  <Zap
                    size={11}
                    className="text-amber-500 dark:text-amber-400 flex-shrink-0"
                  />
                </span>
              )}
              {!mode.isCustom && (
                <span title={strings.modes.builtInTooltip}>
                  <Lock
                    size={11}
                    className="text-muted-foreground flex-shrink-0"
                  />
                </span>
              )}
            </div>
            {canEdit ? (
              <input
                value={display.description}
                onChange={(e) =>
                  setModeDraft((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                onBlur={() =>
                  modeDraft &&
                  saveModeDraft(mode, {
                    ...modeDraft,
                    description: display.description,
                  })
                }
                className={cn(
                  uiClasses.bodyText,
                  "bg-transparent border-0 border-b border-transparent hover:border-border focus:outline-none focus:ring-0 w-full py-0 leading-tight"
                )}
                placeholder={strings.modes.shortDescriptionPlaceholder}
              />
            ) : (
              <p
                className={cn(
                  uiClasses.bodyText,
                  "leading-tight"
                )}
              >
                {mode.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {mode.isCustom && (
            <>
              <IconButton
                icon={<Copy size={14} />}
                aria-label={strings.modes.duplicate}
                variant="ghost"
                size="md"
                onClick={() => handleDuplicateMode(mode)}
              />
              <IconButton
                icon={<Clipboard size={14} />}
                aria-label={strings.modes.export}
                variant="ghost"
                size="md"
                onClick={() => handleExportMode(mode)}
              />
            </>
          )}
          {mode.isCustom &&
            (modeIdToConfirmDelete === mode.id ? (
              <>
                <IconButton
                  icon={<Check size={12} strokeWidth={2.5} />}
                  aria-label={strings.modes.confirmDeletion}
                  variant="danger"
                  size="md"
                  onClick={() => handleDeleteMode(mode.id)}
                />
                <IconButton
                  icon={<X size={12} strokeWidth={2.5} />}
                  aria-label="Cancel"
                  variant="ghost"
                  size="md"
                  onClick={() => setModeIdToConfirmDelete(null)}
                />
              </>
            ) : (
              <IconButton
                icon={<Trash2 size={14} />}
                aria-label={strings.modes.delete}
                variant="danger"
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setModeIdToConfirmDelete(mode.id);
                }}
              />
            ))}
        </div>
      </div>

      {mode.id !== "light" && (
        <div>
          {canEdit ? (
            <SystemPromptEditor
              value={display.systemPrompt}
              onChange={(v) =>
                setModeDraft((prev) => ({
                  ...prev,
                  systemPrompt: v,
                }))
              }
              placeholder={DEFAULT_SYSTEM_PROMPT_PLACEHOLDER}
              onBlur={(v) =>
                saveModeDraft(mode, {
                  ...mode,
                  ...modeDraft,
                  systemPrompt: v,
                })
              }
              onImproveError={setPromptImproveToast}
            />
          ) : (
            <div className="p-2.5 rounded border border-border bg-muted/20 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-[360px] overflow-y-auto text-muted-foreground">
              {mode.systemPrompt}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
});

export { ModeDetail };

import React from "react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { strings } from "@/lib/strings";
import { SystemPromptEditor } from "@/components/SystemPromptEditor";
import { DEFAULT_SYSTEM_PROMPT_PLACEHOLDER } from "@/hooks/useModes";
import type { ModeConfig } from "@/types";
import { Save, X } from "lucide-react";

export interface ModeEditorProps {
  editedMode: ModeConfig;
  setEditedMode: (m: ModeConfig | null) => void;
  setIsEditingMode: (v: boolean) => void;
  handleSaveMode: () => Promise<void>;
  setPromptImproveToast: (v: string | null) => void;
}

const ModeEditor = React.memo(function ModeEditor({
  editedMode,
  setEditedMode,
  setIsEditingMode,
  handleSaveMode,
  setPromptImproveToast,
}: ModeEditorProps) {
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
              backgroundColor: editedMode.color,
            }}
          >
            <input
              type="color"
              value={editedMode.color}
              onChange={(e) =>
                setEditedMode({ ...editedMode, color: e.target.value })
              }
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
              title={strings.modes.color}
              aria-label={strings.modes.color}
            />
          </div>
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <input
              value={editedMode.name}
              onChange={(e) =>
                setEditedMode({ ...editedMode, name: e.target.value })
              }
              className="text-sm font-medium bg-transparent border-0 border-b border-transparent hover:border-border focus:border-foreground/30 focus:outline-none focus:ring-0 py-0 w-full max-w-md text-foreground leading-tight"
              placeholder={strings.modes.modeNamePlaceholder}
            />
            <input
              value={editedMode.description}
              onChange={(e) =>
                setEditedMode({
                  ...editedMode,
                  description: e.target.value,
                })
              }
              className={cn(
                uiClasses.bodyText,
                "bg-transparent border-0 border-b border-transparent hover:border-border focus:outline-none focus:ring-0 w-full py-0 leading-tight"
              )}
              placeholder={strings.modes.shortDescriptionPlaceholder}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleSaveMode}
            className="flex items-center gap-2 text-xs py-2 text-foreground hover:opacity-80 focus:outline-none focus-visible:ring-0"
          >
            <Save size={14} />
            {strings.modes.save}
          </button>
          <button
            onClick={() => {
              setIsEditingMode(false);
              setEditedMode(null);
            }}
            className="flex items-center gap-2 text-xs py-2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-0"
          >
            <X size={14} />
            {strings.modes.cancel}
          </button>
        </div>
      </div>
      <div>
        <SystemPromptEditor
          value={editedMode.systemPrompt}
          onChange={(v) =>
            setEditedMode({ ...editedMode, systemPrompt: v })
          }
          placeholder={DEFAULT_SYSTEM_PROMPT_PLACEHOLDER}
          onImproveError={setPromptImproveToast}
        />
      </div>
    </div>
  );
});

export { ModeEditor };

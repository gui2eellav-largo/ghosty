import React from "react";
import { strings } from "@/lib/strings";

export interface ImportModesModalProps {
  showImportModesModal: boolean;
  setShowImportModesModal: (v: boolean) => void;
  importModesJson: string;
  setImportModesJson: (v: string) => void;
  importModesError: string | null;
  setImportModesError: (v: string | null) => void;
  handleImportModes: () => Promise<void>;
}

const ImportModesModal = React.memo(function ImportModesModal({
  showImportModesModal,
  setShowImportModesModal,
  importModesJson,
  setImportModesJson,
  importModesError,
  setImportModesError,
  handleImportModes,
}: ImportModesModalProps) {
  if (!showImportModesModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
      onClick={() => setShowImportModesModal(false)}
      onKeyDown={(e) =>
        e.key === "Escape" && setShowImportModesModal(false)
      }
      role="button"
      tabIndex={0}
      aria-label={strings.modes.cancel}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- dialog content, stopPropagation only */}
      <div
        className="bg-white dark:bg-[#0c0c0c] border border-black/[0.06] dark:border-white/[0.06] rounded-lg shadow-md w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modes-title"
      >
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <h2
            id="import-modes-title"
            className="text-lg font-bold text-black dark:text-white"
          >
            {strings.modes.importModal.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Paste JSON (array of modes or single mode). Each entry must have{" "}
            <code className="bg-black/5 dark:bg-white/5 px-1 rounded">
              name
            </code>{" "}
            and{" "}
            <code className="bg-black/5 dark:bg-white/5 px-1 rounded">
              systemPrompt
            </code>
            .
          </p>
        </div>
        <div className="p-4 flex-1 min-h-0 flex flex-col gap-3">
          <textarea
            value={importModesJson}
            onChange={(e) => {
              setImportModesJson(e.target.value);
              setImportModesError(null);
            }}
            placeholder='[{"name": "My Mode", "systemPrompt": "..."}]'
            className="w-full flex-1 min-h-[200px] px-3 py-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs font-mono resize-none"
            spellCheck={false}
          />
          {importModesError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {importModesError}
            </p>
          )}
        </div>
        <div className="p-4 border-t border-black/5 dark:border-white/5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setShowImportModesModal(false);
              setImportModesJson("");
              setImportModesError(null);
            }}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
          >
            {strings.modes.cancel}
          </button>
          <button
            type="button"
            onClick={handleImportModes}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-orange-500 text-white hover:bg-orange-600"
          >
            {strings.modes.import}
          </button>
        </div>
      </div>
    </div>
  );
});

export { ImportModesModal };

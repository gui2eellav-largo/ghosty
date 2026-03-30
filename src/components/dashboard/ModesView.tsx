import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { strings } from "@/lib/strings";
import type { ModeConfig } from "@/types";
import { Plus, Clipboard } from "lucide-react";
import { ModesList } from "./ModesList";
import { ModeEditor } from "./ModeEditor";
import { ModeDetail } from "./ModeDetail";
import { ModePlayground } from "./ModePlayground";
import { ImportModesModal } from "./ImportModesModal";

// ---------- Props ----------
export interface ModesViewProps {
  modes: ModeConfig[];
  setModes: React.Dispatch<React.SetStateAction<ModeConfig[]>>;
  selectedModeId: string | null;
  setSelectedModeId: (id: string | null) => void;
  isEditingMode: boolean;
  setIsEditingMode: (v: boolean) => void;
  editedMode: ModeConfig | null;
  setEditedMode: (m: ModeConfig | null) => void;
  modeDraft: Partial<ModeConfig> | null;
  setModeDraft: React.Dispatch<React.SetStateAction<Partial<ModeConfig> | null>>;
  modeIdToConfirmDelete: string | null;
  setModeIdToConfirmDelete: (id: string | null) => void;
  modeRowMenuOpen: string | null;
  setModeRowMenuOpen: (id: string | null) => void;
  modeRowMenuRef: React.RefObject<HTMLDivElement | null>;
  showImportModesModal: boolean;
  setShowImportModesModal: (v: boolean) => void;
  importModesJson: string;
  setImportModesJson: (v: string) => void;
  importModesError: string | null;
  setImportModesError: (v: string | null) => void;
  handleSaveMode: () => Promise<void>;
  handleDeleteMode: (id: string) => Promise<void>;
  handleToggleModeEnabled: (mode: ModeConfig) => Promise<void>;
  saveModeDraft: (mode: ModeConfig, draft: Partial<ModeConfig>) => Promise<void>;
  handleCreateNewMode: () => Promise<void>;
  handleDuplicateMode: (mode: ModeConfig) => Promise<void>;
  handleExportMode: (mode: ModeConfig) => void;
  handleImportModes: () => Promise<void>;
  promptImproveToast: string | null;
  setPromptImproveToast: (v: string | null) => void;
}

export const ModesView = React.memo(function ModesView({
  modes,
  setModes,
  selectedModeId,
  setSelectedModeId,
  isEditingMode,
  setIsEditingMode,
  editedMode,
  setEditedMode,
  modeDraft,
  setModeDraft,
  modeIdToConfirmDelete,
  setModeIdToConfirmDelete,
  modeRowMenuOpen,
  setModeRowMenuOpen,
  modeRowMenuRef,
  showImportModesModal,
  setShowImportModesModal,
  importModesJson,
  setImportModesJson,
  importModesError,
  setImportModesError,
  handleSaveMode,
  handleDeleteMode,
  handleToggleModeEnabled,
  saveModeDraft,
  handleCreateNewMode,
  handleDuplicateMode,
  handleExportMode,
  handleImportModes,
  setPromptImproveToast,
}: ModesViewProps) {
  // Close mode row menu on outside click
  useEffect(() => {
    if (modeRowMenuOpen === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = modeRowMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setModeRowMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- modeRowMenuRef/setModeRowMenuOpen stable
  }, [modeRowMenuOpen]);

  const selectedMode = selectedModeId
    ? modes.find((m) => m.id === selectedModeId) ?? null
    : null;

  return (
    <div className="h-full">
      <header
        className={cn(
          uiClasses.pageHeaderMargin,
          "flex items-center justify-between"
        )}
      >
        <div>
          <h1 className={uiClasses.pageTitle}>{strings.modes.title}</h1>
          <p className={uiClasses.pageDescription}>
            {strings.modes.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowImportModesModal(true);
              setImportModesError(null);
              setImportModesJson("");
            }}
            className={cn(
              uiClasses.buttonGhost,
              "flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
            )}
          >
            <Clipboard size={13} />
            {strings.modes.import}
          </button>
          <button
            onClick={handleCreateNewMode}
            className={cn(uiClasses.buttonPrimary, "flex items-center gap-1.5")}
          >
            <Plus size={13} />
            {strings.modes.newMode}
          </button>
        </div>
      </header>

      <div className="flex gap-6 flex-1 min-h-0">
        <ModesList
          modes={modes}
          setModes={setModes}
          selectedModeId={selectedModeId}
          setSelectedModeId={setSelectedModeId}
          isEditingMode={isEditingMode}
          setIsEditingMode={setIsEditingMode}
          modeIdToConfirmDelete={modeIdToConfirmDelete}
          setModeIdToConfirmDelete={setModeIdToConfirmDelete}
          modeRowMenuOpen={modeRowMenuOpen}
          setModeRowMenuOpen={setModeRowMenuOpen}
          modeRowMenuRef={modeRowMenuRef}
          handleDeleteMode={handleDeleteMode}
          handleToggleModeEnabled={handleToggleModeEnabled}
          handleDuplicateMode={handleDuplicateMode}
          handleExportMode={handleExportMode}
        />

        {/* Content Area - Mode Detail */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-2 scrollbar-thin">
          <div className="max-w-4xl">
            {isEditingMode && editedMode ? (
              <ModeEditor
                editedMode={editedMode}
                setEditedMode={setEditedMode}
                setIsEditingMode={setIsEditingMode}
                handleSaveMode={handleSaveMode}
                setPromptImproveToast={setPromptImproveToast}
              />
            ) : selectedMode ? (
              <ModeDetail
                mode={selectedMode}
                modeDraft={modeDraft}
                setModeDraft={setModeDraft}
                modeIdToConfirmDelete={modeIdToConfirmDelete}
                setModeIdToConfirmDelete={setModeIdToConfirmDelete}
                saveModeDraft={saveModeDraft}
                handleDeleteMode={handleDeleteMode}
                handleDuplicateMode={handleDuplicateMode}
                handleExportMode={handleExportMode}
                setPromptImproveToast={setPromptImproveToast}
              >
                <ModePlayground
                  modes={modes}
                  selectedModeId={selectedModeId}
                />
              </ModeDetail>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm mb-1">
                  {strings.modes.selectOrCreate}
                </p>
                <p className={cn(uiClasses.bodyText, "opacity-80")}>
                  {strings.modes.builtInList}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ImportModesModal
        showImportModesModal={showImportModesModal}
        setShowImportModesModal={setShowImportModesModal}
        importModesJson={importModesJson}
        setImportModesJson={setImportModesJson}
        importModesError={importModesError}
        setImportModesError={setImportModesError}
        handleImportModes={handleImportModes}
      />
    </div>
  );
});

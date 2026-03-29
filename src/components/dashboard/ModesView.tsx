import React, { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { strings } from "@/lib/strings";
import { api } from "@/api/tauri";
import { IconButton } from "@/components/ui/icon-button";
import { SystemPromptEditor } from "@/components/SystemPromptEditor";
import { DEFAULT_SYSTEM_PROMPT_PLACEHOLDER } from "@/hooks/useModes";
import type { ModeConfig } from "@/types";
import { DIRECT_MODE_ID } from "@/types";
import {
  Plus,
  Copy,
  Clipboard,
  Trash2,
  Check,
  X,
  Save,
  Eye,
  EyeOff,
  Zap,
  Lock,
  MoreHorizontal,
  GripVertical,
  Loader2,
} from "lucide-react";

// ---------- SortableModeRow ----------
function SortableModeRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (props: {
    dragHandleProps: React.HTMLAttributes<HTMLElement>;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {children({ dragHandleProps: { ...attributes, ...listeners }, isDragging })}
    </div>
  );
}

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

export function ModesView({
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
  const [playgroundInput, setPlaygroundInput] = useState("");
  const [playgroundOutput, setPlaygroundOutput] = useState("");
  const [playgroundLoading, setPlaygroundLoading] = useState(false);

  useEffect(() => {
    setPlaygroundInput("");
    setPlaygroundOutput("");
  }, [selectedModeId]);

  const handlePlayground = useCallback(async () => {
    const mode = modes.find((m) => m.id === selectedModeId);
    if (!playgroundInput.trim() || !mode) return;
    setPlaygroundLoading(true);
    setPlaygroundOutput("");
    try {
      const result = await api.llm.transformText(playgroundInput, mode.systemPrompt);
      setPlaygroundOutput(result);
    } catch (e) {
      setPlaygroundOutput(strings.errors.playgroundError(String(e)));
    } finally {
      setPlaygroundLoading(false);
    }
  }, [modes, selectedModeId, playgroundInput]);

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

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const allSorted = [...modes].sort((a, b) => a.order - b.order);
      const allIds = allSorted.map((m) => m.id);
      const fromIdx = allIds.indexOf(String(active.id));
      const toIdx = allIds.indexOf(String(over.id));
      if (fromIdx < 0 || toIdx < 0) return;
      const newOrder = [...allIds];
      const [moved] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, moved!);
      try {
        const updated = await api.modes.reorder(newOrder);
        setModes(updated.sort((a, b) => a.order - b.order));
      } catch (e) {
        console.error(e);
      }
    },
    [modes, setModes]
  );

  const builtIn = modes.filter((m) => !m.isCustom).sort((a, b) => a.order - b.order);
  const custom = modes.filter((m) => m.isCustom).sort((a, b) => a.order - b.order);

  const renderModeRow = (mode: ModeConfig) => {
    const isDraggable = mode.isCustom;
    return (
      <SortableModeRow key={mode.id} id={mode.id} disabled={!isDraggable}>
        {({ dragHandleProps, isDragging }) => (
          <div
            className={cn(
              "w-full flex items-center py-1.5 rounded text-xs group overflow-visible relative pr-8",
              isDraggable ? "pl-5" : "pl-2",
              isDragging ? "opacity-50" : "",
              selectedModeId === mode.id && !isEditingMode
                ? "bg-black/[0.06] dark:bg-white/[0.06] text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
            )}
          >
            {isDraggable && (
              <div
                {...dragHandleProps}
                className="absolute left-0.5 top-0 bottom-0 flex items-center justify-center w-4 opacity-0 group-hover:opacity-40 hover:opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground"
                aria-label="Drag to reorder"
              >
                <GripVertical size={10} strokeWidth={2} />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedModeId(mode.id);
                setIsEditingMode(false);
              }}
              className="flex-1 min-w-0 flex items-center gap-2.5 text-left overflow-hidden"
            >
              <div
                className={cn(
                  "shrink-0 rounded-full",
                  !mode.enabled && "opacity-40"
                )}
                style={{
                  width: 6,
                  height: 6,
                  minWidth: 6,
                  minHeight: 6,
                  backgroundColor: mode.enabled ? mode.color : "#9ca3af",
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs">{mode.name}</span>
                  {mode.id === DIRECT_MODE_ID && (
                    <span title="Your words, light formatting only.">
                      <Zap
                        size={10}
                        className="text-amber-500 dark:text-amber-400 flex-shrink-0"
                      />
                    </span>
                  )}
                  {!mode.isCustom && (
                    <span title="Built-in (cannot be deleted)">
                      <Lock
                        size={10}
                        className="text-muted-foreground flex-shrink-0"
                      />
                    </span>
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    className="p-0.5 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.06] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title={
                      mode.enabled
                        ? "Visible in widget (click to hide)"
                        : "Hidden from widget (click to show)"
                    }
                    aria-label={mode.enabled ? "Hide from widget" : "Show in widget"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleModeEnabled(mode);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleModeEnabled(mode);
                      }
                    }}
                  >
                    {mode.enabled ? (
                      <Eye size={10} className="text-muted-foreground" />
                    ) : (
                      <EyeOff
                        size={10}
                        className="text-muted-foreground opacity-60"
                      />
                    )}
                  </span>
                </div>
              </div>
            </button>
            {mode.id === DIRECT_MODE_ID
              ? null
              : modeIdToConfirmDelete !== mode.id &&
                (!mode.isCustom ? (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="p-1 rounded-sm hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-muted-foreground hover:text-foreground flex items-center justify-center"
                      title="Duplicate"
                      aria-label="Duplicate mode"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDuplicateMode(mode);
                      }}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity"
                    ref={
                      modeRowMenuOpen === mode.id ? modeRowMenuRef : undefined
                    }
                  >
                    <button
                      type="button"
                      className="p-1 rounded-sm hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-muted-foreground hover:text-foreground flex items-center justify-center"
                      title="Actions"
                      aria-label="Mode actions"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setModeRowMenuOpen(
                          modeRowMenuOpen === mode.id ? null : mode.id
                        );
                      }}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {modeRowMenuOpen === mode.id && (
                      <div className="absolute right-0 top-full mt-0.5 py-0.5 min-w-[180px] rounded border border-border bg-popover shadow-sm z-30 flex flex-col">
                        <button
                          type="button"
                          className="flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.04] w-full text-foreground"
                          onClick={() => {
                            handleDuplicateMode(mode);
                            setModeRowMenuOpen(null);
                          }}
                        >
                          <Copy
                            size={12}
                            className="flex-shrink-0 text-muted-foreground"
                          />
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.04] w-full text-foreground"
                          onClick={() => {
                            handleExportMode(mode);
                            setModeRowMenuOpen(null);
                          }}
                        >
                          <Clipboard
                            size={12}
                            className="flex-shrink-0 text-muted-foreground"
                          />
                          Export
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-red-500/10 text-red-600 w-full"
                          onClick={() => {
                            setModeIdToConfirmDelete(mode.id);
                            setModeRowMenuOpen(null);
                          }}
                        >
                          <Trash2 size={12} className="flex-shrink-0" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            {modeIdToConfirmDelete === mode.id && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex items-center gap-0.5 opacity-100">
                <button
                  type="button"
                  className="p-1 rounded-sm text-red-500 hover:bg-red-500/10 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMode(mode.id);
                  }}
                  title="Delete"
                  aria-label="Confirm delete"
                >
                  <Check size={11} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className="p-1 rounded-sm text-muted-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.06] flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModeIdToConfirmDelete(null);
                  }}
                  title="Cancel"
                  aria-label="Cancel"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        )}
      </SortableModeRow>
    );
  };

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
        {/* Sidebar - Modes List */}
        <nav className="w-48 flex-shrink-0">
          <div className="space-y-0.5 pr-1">
            {builtIn.length > 0 && (
              <div className="space-y-0.5">
                <div className={cn(uiClasses.sectionLabel, "px-2 py-1")}>
                  {strings.modes.builtIn}
                </div>
                {builtIn.map(renderModeRow)}
              </div>
            )}
            {custom.length > 0 && (
              <div className="space-y-0.5 mt-2">
                <div className={cn(uiClasses.sectionLabel, "px-2 py-1")}>
                  {strings.modes.custom}
                </div>
                <DndContext
                  sensors={dndSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={custom.map((m) => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {custom.map(renderModeRow)}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </nav>

        {/* Content Area - Mode Detail */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-2 scrollbar-thin">
          <div className="max-w-4xl">
            {isEditingMode && editedMode ? (
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
                        title="Color"
                        aria-label="Color"
                      />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <input
                        value={editedMode.name}
                        onChange={(e) =>
                          setEditedMode({ ...editedMode, name: e.target.value })
                        }
                        className="text-sm font-medium bg-transparent border-0 border-b border-transparent hover:border-border focus:border-foreground/30 focus:outline-none focus:ring-0 py-0 w-full max-w-md text-foreground leading-tight"
                        placeholder="Mode name"
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
                        placeholder="Short description"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={handleSaveMode}
                      className="flex items-center gap-2 text-xs py-2 text-foreground hover:opacity-80 focus:outline-none focus-visible:ring-0"
                    >
                      <Save size={14} />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingMode(false);
                        setEditedMode(null);
                      }}
                      className="flex items-center gap-2 text-xs py-2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-0"
                    >
                      <X size={14} />
                      Cancel
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
            ) : selectedModeId &&
              modes.find((m) => m.id === selectedModeId) ? (
              (() => {
                const mode = modes.find((m) => m.id === selectedModeId)!;
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
                                placeholder="Mode name"
                              />
                            ) : (
                              <h2 className="text-sm font-medium text-foreground leading-tight">
                                {mode.name}
                              </h2>
                            )}
                            {mode.id === DIRECT_MODE_ID && (
                              <span title="Your words, light formatting only.">
                                <Zap
                                  size={11}
                                  className="text-amber-500 dark:text-amber-400 flex-shrink-0"
                                />
                              </span>
                            )}
                            {!mode.isCustom && (
                              <span title="Built-in (cannot be deleted)">
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
                              placeholder="Short description"
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
                              aria-label="Duplicate"
                              variant="ghost"
                              size="md"
                              onClick={() => handleDuplicateMode(mode)}
                            />
                            <IconButton
                              icon={<Clipboard size={14} />}
                              aria-label="Export"
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
                                aria-label="Confirm deletion"
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
                              aria-label="Delete"
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
                    {mode.id !== DIRECT_MODE_ID && (
                      <div className="border-t border-border pt-4">
                        <p className="text-[11px] text-muted-foreground mb-2">
                          {strings.modes.playground.testMode}
                        </p>
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={playgroundInput}
                            onChange={(e) => setPlaygroundInput(e.target.value)}
                            placeholder={strings.modes.playground.placeholder}
                            className="w-full min-h-[80px] p-2.5 rounded border border-border bg-muted/30 font-mono text-[11px] leading-relaxed resize-y focus:border-foreground/20 focus:outline-none focus:ring-1"
                            spellCheck={false}
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handlePlayground}
                              disabled={
                                !playgroundInput.trim() || playgroundLoading
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {playgroundLoading && (
                                <Loader2
                                  size={11}
                                  className="animate-spin"
                                />
                              )}
                              {strings.modes.playground.apply}
                            </button>
                          </div>
                          {playgroundOutput && (
                            <div className="relative">
                              <div className="w-full min-h-[60px] p-2.5 pr-8 rounded border border-border bg-muted/20 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground">
                                {playgroundOutput}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  navigator.clipboard.writeText(playgroundOutput)
                                }
                                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                                title={strings.modes.playground.copy}
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
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

      {showImportModesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
          onClick={() => setShowImportModesModal(false)}
          onKeyDown={(e) =>
            e.key === "Escape" && setShowImportModesModal(false)
          }
          role="button"
          tabIndex={0}
          aria-label="Close modal"
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
      )}
    </div>
  );
}

import React from "react";
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
import type { ModeConfig } from "@/types";
import { DIRECT_MODE_ID } from "@/types";
import {
  Copy,
  Clipboard,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  Zap,
  Lock,
  MoreHorizontal,
  GripVertical,
} from "lucide-react";
import { useCallback } from "react";

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

export interface ModesListProps {
  modes: ModeConfig[];
  setModes: React.Dispatch<React.SetStateAction<ModeConfig[]>>;
  selectedModeId: string | null;
  setSelectedModeId: (id: string | null) => void;
  isEditingMode: boolean;
  setIsEditingMode: (v: boolean) => void;
  modeIdToConfirmDelete: string | null;
  setModeIdToConfirmDelete: (id: string | null) => void;
  modeRowMenuOpen: string | null;
  setModeRowMenuOpen: (id: string | null) => void;
  modeRowMenuRef: React.RefObject<HTMLDivElement | null>;
  handleDeleteMode: (id: string) => Promise<void>;
  handleToggleModeEnabled: (mode: ModeConfig) => Promise<void>;
  handleDuplicateMode: (mode: ModeConfig) => Promise<void>;
  handleExportMode: (mode: ModeConfig) => void;
}

const ModesList = React.memo(function ModesList({
  modes,
  setModes,
  selectedModeId,
  setSelectedModeId,
  isEditingMode,
  setIsEditingMode,
  modeIdToConfirmDelete,
  setModeIdToConfirmDelete,
  modeRowMenuOpen,
  setModeRowMenuOpen,
  modeRowMenuRef,
  handleDeleteMode,
  handleToggleModeEnabled,
  handleDuplicateMode,
  handleExportMode,
}: ModesListProps) {
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
                aria-label={strings.modes.dragToReorder}
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
                    <span title={strings.modes.directModeTooltip}>
                      <Zap
                        size={10}
                        className="text-amber-500 dark:text-amber-400 flex-shrink-0"
                      />
                    </span>
                  )}
                  {!mode.isCustom && (
                    <span title={strings.modes.builtInTooltip}>
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
                        ? strings.modes.visibleInWidget
                        : strings.modes.hiddenFromWidget
                    }
                    aria-label={mode.enabled ? strings.modes.hideFromWidget : strings.modes.showInWidget}
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
                      title={strings.modes.duplicate}
                      aria-label={strings.modes.duplicateMode}
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
                      title={strings.modes.actions}
                      aria-label={strings.modes.modeActions}
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
                          {strings.modes.duplicate}
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
                          {strings.modes.export}
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
                          {strings.modes.delete}
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
                  title={strings.modes.delete}
                  aria-label={strings.modes.confirmDeletion}
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
                  title={strings.modes.cancel}
                  aria-label={strings.modes.cancel}
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
  );
});

export { ModesList };

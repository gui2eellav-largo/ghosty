import { cn } from "@/lib/utils";
import { uiClasses } from "@/lib/design-tokens";
import { strings } from "@/lib/strings";
import { IconButton } from "@/components/ui/icon-button";
import { AddWordModal } from "@/components/AddWordModal";
import type { DictionaryEntry } from "@/types";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useState, useCallback } from "react";

export interface DictionaryViewProps {
  dictionaryEntries: DictionaryEntry[];
  editingDictionaryId: string | null;
  setEditingDictionaryId: (id: string | null) => void;
  misspellingDrafts: Record<string, string>;
  onMisspellingChange: (id: string, value: string) => void;
  onMisspellingSave: (id: string) => Promise<void>;
  onDeleteWord: (id: string) => Promise<void>;
  onEditDictionaryEntry: (id: string) => void;
  onAddWord: (payload: {
    word: string;
    type: string;
    pronunciation?: string;
    misspellings?: string[];
  }) => Promise<void>;
}

export function DictionaryView({
  dictionaryEntries,
  editingDictionaryId,
  setEditingDictionaryId,
  misspellingDrafts,
  onMisspellingChange,
  onMisspellingSave,
  onDeleteWord,
  onEditDictionaryEntry,
  onAddWord,
}: DictionaryViewProps) {
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);

  const handleOpenAddModal = useCallback(() => {
    setIsAddWordModalOpen(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setIsAddWordModalOpen(false);
  }, []);

  return (
    <div>
      <header className={uiClasses.pageHeaderMargin}>
        <h1 className={uiClasses.pageTitle}>{strings.dictionary.title}</h1>
        <p className={cn(uiClasses.pageDescription, "leading-relaxed")}>
          {strings.dictionary.description}
        </p>
      </header>

      {/* Guide */}
      <div className={cn(uiClasses.infoBox, "mb-6 py-4 px-4")}>
        <h3 className={cn(uiClasses.sectionLabel, "mb-2")}>
          {strings.dictionary.guide.title}
        </h3>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside mb-3">
          <li>
            Click <strong className="text-foreground">Add word</strong> to add a
            word or a correction (recognized form &rarr; preferred form).
          </li>
          <li>
            Optional: on an entry, click{" "}
            <strong className="text-foreground">Add variants</strong> for other
            spellings.
          </li>
          <li>
            Dictate a sentence containing that word (using your shortcut) and
            check the result in the Home history.
          </li>
        </ol>
        <p className={cn(uiClasses.bodyText, "opacity-90")}>
          Entries are sent to Whisper as context to guide recognition. If a word
          is still not recognized well, add variants or a phonetic pronunciation
          if supported.
        </p>
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={handleOpenAddModal}
          className={cn(uiClasses.buttonPrimary, "flex items-center gap-2")}
        >
          <Plus size={16} />
          {strings.dictionary.addWord}
        </button>
      </div>
      <AddWordModal
        isOpen={isAddWordModalOpen}
        onClose={handleCloseAddModal}
        onAdd={onAddWord}
      />

      {/* Entries List */}
      <div className="space-y-4">
        {dictionaryEntries.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <BookOpen size={32} className={uiClasses.emptyStateIcon} />
            <p className={uiClasses.emptyStateTitle}>
              {strings.dictionary.noDictionaryEntries}
            </p>
            <button
              onClick={handleOpenAddModal}
              className={cn(
                uiClasses.buttonPrimary,
                "mt-2 flex items-center gap-2"
              )}
            >
              <Plus size={14} />
              {strings.dictionary.addFirstWord}
            </button>
          </div>
        ) : (
          <div className={cn(uiClasses.pageCard, "overflow-hidden")}>
            {dictionaryEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 border-b border-black/[0.06] dark:border-white/[0.06] last:border-0 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] group"
              >
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-sm">{entry.word}</span>
                  </div>
                  {editingDictionaryId === entry.id ? (
                    <input
                      type="text"
                      value={misspellingDrafts[entry.id] ?? ""}
                      onChange={(e) =>
                        onMisspellingChange(entry.id, e.target.value)
                      }
                      onBlur={() => {
                        onMisspellingSave(entry.id);
                        setEditingDictionaryId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder={strings.dictionary.variantsPlaceholder}
                      className={cn(uiClasses.input, "text-xs py-2")}
                    />
                  ) : (
                    <button
                      onClick={() => onEditDictionaryEntry(entry.id)}
                      className="w-full text-left text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      {entry.misspellings.length > 0
                        ? entry.misspellings.join(", ")
                        : strings.dictionary.addVariants}
                    </button>
                  )}
                </div>
                <IconButton
                  icon={<Trash2 size={14} />}
                  aria-label={strings.dictionary.removeEntry}
                  variant="danger"
                  size="md"
                  onClick={() => onDeleteWord(entry.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

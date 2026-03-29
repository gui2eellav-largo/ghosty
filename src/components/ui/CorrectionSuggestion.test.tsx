import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CorrectionSuggestion } from "./CorrectionSuggestion";
import type { WordCandidate } from "@/types";

const candidates: WordCandidate[] = [
  { misspelling: "teh", correction: "the", confidence: 0.9 },
  { misspelling: "recieve", correction: "receive", confidence: 0.85 },
];

describe("CorrectionSuggestion", () => {
  const onAccept = vi.fn();
  const onDismiss = vi.fn();
  const onDismissAll = vi.fn();

  beforeEach(() => {
    onAccept.mockReset();
    onDismiss.mockReset();
    onDismissAll.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should not render when candidates array is empty", () => {
    const { container } = render(
      <CorrectionSuggestion
        candidates={[]}
        onAccept={onAccept}
        onDismiss={onDismiss}
        onDismissAll={onDismissAll}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("should display the first correction candidate", () => {
    render(
      <CorrectionSuggestion
        candidates={candidates}
        onAccept={onAccept}
        onDismiss={onDismiss}
        onDismissAll={onDismissAll}
      />
    );
    expect(screen.getByText("teh")).toBeInTheDocument();
    expect(screen.getByText("the")).toBeInTheDocument();
  });

  it("should display remaining count when multiple candidates", () => {
    render(
      <CorrectionSuggestion
        candidates={candidates}
        onAccept={onAccept}
        onDismiss={onDismiss}
        onDismissAll={onDismissAll}
      />
    );
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("should not display remaining count for single candidate", () => {
    render(
      <CorrectionSuggestion
        candidates={[candidates[0]]}
        onAccept={onAccept}
        onDismiss={onDismiss}
        onDismissAll={onDismissAll}
      />
    );
    expect(screen.queryByText("+0")).not.toBeInTheDocument();
  });

  it("should call onAccept and advance to next candidate when Accept is clicked", () => {
    render(
      <CorrectionSuggestion
        candidates={candidates}
        onAccept={onAccept}
        onDismiss={onDismiss}
        onDismissAll={onDismissAll}
      />
    );

    // Accept button has aria-label with the correction word
    const acceptBtn = screen.getByLabelText(/Add.*"the".*dictionary/);
    fireEvent.click(acceptBtn);

    expect(onAccept).toHaveBeenCalledWith(candidates[0]);
    // Should now show the second candidate
    expect(screen.getByText("recieve")).toBeInTheDocument();
    expect(screen.getByText("receive")).toBeInTheDocument();
  });

  it("should call onDismiss and advance to next candidate when Dismiss is clicked", () => {
    render(
      <CorrectionSuggestion
        candidates={candidates}
        onAccept={onAccept}
        onDismiss={onDismiss}
        onDismissAll={onDismissAll}
      />
    );

    const dismissBtn = screen.getByLabelText("Dismiss");
    fireEvent.click(dismissBtn);

    expect(onDismiss).toHaveBeenCalledWith(candidates[0]);
    expect(screen.getByText("recieve")).toBeInTheDocument();
  });

  it("should call onDismissAll when last candidate is accepted", () => {
    render(
      <CorrectionSuggestion
        candidates={[candidates[0]]}
        onAccept={onAccept}
        onDismiss={onDismiss}
        onDismissAll={onDismissAll}
      />
    );

    const acceptBtn = screen.getByLabelText(/Add.*"the".*dictionary/);
    fireEvent.click(acceptBtn);

    expect(onAccept).toHaveBeenCalledWith(candidates[0]);
    expect(onDismissAll).toHaveBeenCalled();
  });

  it("should auto-dismiss after 12 seconds", () => {
    render(
      <CorrectionSuggestion
        candidates={candidates}
        onAccept={onAccept}
        onDismiss={onDismiss}
        onDismissAll={onDismissAll}
      />
    );

    expect(onDismissAll).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(12_000);
    });

    expect(onDismissAll).toHaveBeenCalled();
  });

  it("should have an alert role for accessibility", () => {
    render(
      <CorrectionSuggestion
        candidates={candidates}
        onAccept={onAccept}
        onDismiss={onDismiss}
        onDismissAll={onDismissAll}
      />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

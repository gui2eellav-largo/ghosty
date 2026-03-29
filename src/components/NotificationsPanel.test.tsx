import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationsPanel } from "./NotificationsPanel";
import type { CorrectionNotification } from "@/types";

const sampleNotifications: CorrectionNotification[] = [
  {
    id: "n1",
    candidate: { misspelling: "teh", correction: "the", confidence: 0.9 },
    createdAt: Date.now(),
  },
  {
    id: "n2",
    candidate: { misspelling: "recieve", correction: "receive", confidence: 0.85 },
    createdAt: Date.now(),
  },
];

describe("NotificationsPanel", () => {
  const onClose = vi.fn();
  const onAcceptCorrection = vi.fn();
  const onDismissCorrection = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
    onAcceptCorrection.mockReset();
    onDismissCorrection.mockReset();
  });

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <NotificationsPanel
        isOpen={false}
        onClose={onClose}
        correctionNotifications={sampleNotifications}
        onAcceptCorrection={onAcceptCorrection}
        onDismissCorrection={onDismissCorrection}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("should render when isOpen is true", () => {
    render(
      <NotificationsPanel
        isOpen={true}
        onClose={onClose}
        correctionNotifications={sampleNotifications}
        onAcceptCorrection={onAcceptCorrection}
        onDismissCorrection={onDismissCorrection}
      />
    );
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("should display correction notifications", () => {
    render(
      <NotificationsPanel
        isOpen={true}
        onClose={onClose}
        correctionNotifications={sampleNotifications}
        onAcceptCorrection={onAcceptCorrection}
        onDismissCorrection={onDismissCorrection}
      />
    );
    expect(screen.getByText("teh")).toBeInTheDocument();
    expect(screen.getByText("the")).toBeInTheDocument();
    expect(screen.getByText("recieve")).toBeInTheDocument();
    expect(screen.getByText("receive")).toBeInTheDocument();
  });

  it("should display empty state when no notifications", () => {
    render(
      <NotificationsPanel
        isOpen={true}
        onClose={onClose}
        correctionNotifications={[]}
        onAcceptCorrection={onAcceptCorrection}
        onDismissCorrection={onDismissCorrection}
      />
    );
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("should call onAcceptCorrection when clicking Add", () => {
    render(
      <NotificationsPanel
        isOpen={true}
        onClose={onClose}
        correctionNotifications={sampleNotifications}
        onAcceptCorrection={onAcceptCorrection}
        onDismissCorrection={onDismissCorrection}
      />
    );

    const addButtons = screen.getAllByText("Add");
    fireEvent.click(addButtons[0]);
    expect(onAcceptCorrection).toHaveBeenCalledWith(sampleNotifications[0]);
  });

  it("should call onDismissCorrection when clicking Dismiss", () => {
    render(
      <NotificationsPanel
        isOpen={true}
        onClose={onClose}
        correctionNotifications={sampleNotifications}
        onAcceptCorrection={onAcceptCorrection}
        onDismissCorrection={onDismissCorrection}
      />
    );

    const dismissButtons = screen.getAllByLabelText("Dismiss");
    fireEvent.click(dismissButtons[0]);
    expect(onDismissCorrection).toHaveBeenCalledWith("n1");
  });

  it("should close when Escape key is pressed", () => {
    render(
      <NotificationsPanel
        isOpen={true}
        onClose={onClose}
        correctionNotifications={sampleNotifications}
        onAcceptCorrection={onAcceptCorrection}
        onDismissCorrection={onDismissCorrection}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("should have the Notifications dialog role", () => {
    render(
      <NotificationsPanel
        isOpen={true}
        onClose={onClose}
        correctionNotifications={[]}
        onAcceptCorrection={onAcceptCorrection}
        onDismissCorrection={onDismissCorrection}
      />
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Notifications");
  });
});

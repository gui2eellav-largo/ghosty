import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfilePopover } from "./ProfilePopover";

describe("ProfilePopover", () => {
  const onClose = vi.fn();
  const onManageAccount = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
    onManageAccount.mockReset();
  });

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <ProfilePopover
        isOpen={false}
        onClose={onClose}
        displayName="John Doe"
        wordsGenerated={100}
        onManageAccount={onManageAccount}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("should render when isOpen is true", () => {
    render(
      <ProfilePopover
        isOpen={true}
        onClose={onClose}
        displayName="John Doe"
        wordsGenerated={100}
        onManageAccount={onManageAccount}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should display the user name", () => {
    render(
      <ProfilePopover
        isOpen={true}
        onClose={onClose}
        displayName="John Doe"
        wordsGenerated={100}
        onManageAccount={onManageAccount}
      />
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should display initials from the display name", () => {
    render(
      <ProfilePopover
        isOpen={true}
        onClose={onClose}
        displayName="John Doe"
        wordsGenerated={100}
        onManageAccount={onManageAccount}
      />
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("should display Guest when displayName is empty", () => {
    render(
      <ProfilePopover
        isOpen={true}
        onClose={onClose}
        displayName=""
        wordsGenerated={50}
        onManageAccount={onManageAccount}
      />
    );
    expect(screen.getByText("Guest")).toBeInTheDocument();
  });

  it("should display words generated count", () => {
    render(
      <ProfilePopover
        isOpen={true}
        onClose={onClose}
        displayName="Jane"
        wordsGenerated={500}
        onManageAccount={onManageAccount}
      />
    );
    expect(screen.getByText("500 words generated")).toBeInTheDocument();
  });

  it("should format large word counts with K suffix", () => {
    render(
      <ProfilePopover
        isOpen={true}
        onClose={onClose}
        displayName="Jane"
        wordsGenerated={2500}
        onManageAccount={onManageAccount}
      />
    );
    expect(screen.getByText("2.5K words generated")).toBeInTheDocument();
  });

  it("should call onManageAccount and onClose when clicking Manage account", () => {
    render(
      <ProfilePopover
        isOpen={true}
        onClose={onClose}
        displayName="Jane"
        wordsGenerated={100}
        onManageAccount={onManageAccount}
      />
    );

    fireEvent.click(screen.getByText("Manage account"));
    expect(onManageAccount).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("should close when Escape key is pressed", () => {
    render(
      <ProfilePopover
        isOpen={true}
        onClose={onClose}
        displayName="Jane"
        wordsGenerated={100}
        onManageAccount={onManageAccount}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

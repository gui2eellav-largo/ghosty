import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddWordModal } from "./AddWordModal";

describe("AddWordModal", () => {
  const onClose = vi.fn();
  const onAdd = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    onClose.mockReset();
    onAdd.mockReset().mockResolvedValue(undefined);
  });

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <AddWordModal isOpen={false} onClose={onClose} onAdd={onAdd} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("should render when isOpen is true", () => {
    render(<AddWordModal isOpen={true} onClose={onClose} onAdd={onAdd} />);
    expect(screen.getByText("Add to vocabulary")).toBeInTheDocument();
  });

  it("should show validation error when submitting empty word", async () => {
    render(<AddWordModal isOpen={true} onClose={onClose} onAdd={onAdd} />);
    fireEvent.click(screen.getByText("Add word"));
    expect(await screen.findByText("Word cannot be empty")).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("should submit a word successfully", async () => {
    render(<AddWordModal isOpen={true} onClose={onClose} onAdd={onAdd} />);

    const input = screen.getByPlaceholderText("e.g., API, GitHub, Kubernetes");
    fireEvent.change(input, { target: { value: "Ghosty" } });
    fireEvent.click(screen.getByText("Add word"));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        word: "Ghosty",
        type: "Custom",
      });
    });
    // Should close after successful add
    expect(onClose).toHaveBeenCalled();
  });

  it("should toggle correction mode and show misspelling fields", () => {
    render(<AddWordModal isOpen={true} onClose={onClose} onAdd={onAdd} />);

    // Click the correction toggle switch
    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    expect(screen.getByPlaceholderText("e.g. Whispr")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Wispr")).toBeInTheDocument();
  });

  it("should validate misspelling fields when in correction mode", async () => {
    render(<AddWordModal isOpen={true} onClose={onClose} onAdd={onAdd} />);

    // Enable correction mode
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByText("Add word"));

    expect(
      await screen.findByText("Misspelling and correct spelling are required")
    ).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("should submit correction misspelling data", async () => {
    render(<AddWordModal isOpen={true} onClose={onClose} onAdd={onAdd} />);

    // Enable correction mode
    fireEvent.click(screen.getByRole("switch"));

    const misspellingInput = screen.getByPlaceholderText("e.g. Whispr");
    const correctInput = screen.getByPlaceholderText("e.g. Wispr");

    fireEvent.change(misspellingInput, { target: { value: "Whispr" } });
    fireEvent.change(correctInput, { target: { value: "Wispr" } });
    fireEvent.click(screen.getByText("Add word"));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        word: "Wispr",
        type: "Custom",
        misspellings: ["Whispr"],
      });
    });
  });

  it("should reset form and close when Cancel is clicked", () => {
    render(<AddWordModal isOpen={true} onClose={onClose} onAdd={onAdd} />);

    const input = screen.getByPlaceholderText("e.g., API, GitHub, Kubernetes");
    fireEvent.change(input, { target: { value: "something" } });

    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("should reset form and close when X button is clicked", () => {
    render(<AddWordModal isOpen={true} onClose={onClose} onAdd={onAdd} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("should show error from onAdd rejection", async () => {
    onAdd.mockRejectedValueOnce(new Error("Server error"));

    render(<AddWordModal isOpen={true} onClose={onClose} onAdd={onAdd} />);

    const input = screen.getByPlaceholderText("e.g., API, GitHub, Kubernetes");
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.click(screen.getByText("Add word"));

    expect(await screen.findByText("Server error")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

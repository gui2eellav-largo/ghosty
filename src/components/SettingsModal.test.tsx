import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToggleSwitch } from "./SettingsModal";

describe("ToggleSwitch", () => {
  it("renders with role switch and aria-checked", () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("toggles on click", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

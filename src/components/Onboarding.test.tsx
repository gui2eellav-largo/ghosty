import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { mockInvoke } from "@/test/tauri-mock";
import { Onboarding } from "./Onboarding";

describe("Onboarding", () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    mockInvoke.mockReset();
    onComplete.mockReset();
  });

  it("should render the welcome step initially", () => {
    render(<Onboarding onComplete={onComplete} />);
    expect(screen.getByText("Welcome to Ghosty")).toBeInTheDocument();
    expect(screen.getByText("Get started")).toBeInTheDocument();
  });

  it("should navigate to How it works step when clicking Get started", () => {
    render(<Onboarding onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Get started"));
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  it("should navigate to API key step when clicking Continue", () => {
    render(<Onboarding onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Get started"));
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Connect your API key")).toBeInTheDocument();
    expect(screen.getByText("Save and continue")).toBeInTheDocument();
  });

  it("should show error when saving an empty API key", async () => {
    render(<Onboarding onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Get started"));
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Save and continue"));
    expect(await screen.findByText("Enter your API key.")).toBeInTheDocument();
  });

  it("should show error when API key does not start with sk-", async () => {
    render(<Onboarding onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Get started"));
    fireEvent.click(screen.getByText("Continue"));

    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "invalid-key-123" } });
    fireEvent.click(screen.getByText("Save and continue"));

    expect(await screen.findByText("Key must start with sk-")).toBeInTheDocument();
  });

  it("should validate and save a valid API key then advance to Ready step", async () => {
    mockInvoke.mockResolvedValue(undefined);

    render(<Onboarding onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Get started"));
    fireEvent.click(screen.getByText("Continue"));

    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "sk-test1234567890" } });
    fireEvent.click(screen.getByText("Save and continue"));

    // Should call test_openai_key then add_api_key_entry
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("test_openai_key", {
        key: "sk-test1234567890",
        provider: "openai",
      });
    });
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("add_api_key_entry", {
        name: "Default",
        provider: "openai",
        key: "sk-test1234567890",
      });
    });

    // After success, it advances to the Ready step after a timeout
    await waitFor(
      () => {
        expect(screen.getByText("You're all set")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("should skip API key step and go to Ready", () => {
    render(<Onboarding onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Get started"));
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText(/Skip for now/));
    expect(screen.getByText("You're all set")).toBeInTheDocument();
  });

  it("should call onComplete when clicking Open Ghosty on the Ready step", () => {
    render(<Onboarding onComplete={onComplete} />);
    // Navigate to the Ready step
    fireEvent.click(screen.getByText("Get started"));
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText(/Skip for now/));

    fireEvent.click(screen.getByText("Open Ghosty"));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("should render step dots showing progress", () => {
    const { container } = render(<Onboarding onComplete={onComplete} />);
    // 4 step dots
    const dots = container.querySelectorAll(".rounded-full");
    expect(dots.length).toBe(4);
  });
});

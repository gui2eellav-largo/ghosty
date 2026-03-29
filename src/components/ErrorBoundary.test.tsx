import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

// A component that throws on demand
function Thrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test error");
  return <div>All good</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Suppress console.error for expected error boundary logs
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should render children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("should render fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Reload")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("should call window.location.reload when clicking Reload", () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText("Reload"));
    expect(reloadMock).toHaveBeenCalled();
  });
});

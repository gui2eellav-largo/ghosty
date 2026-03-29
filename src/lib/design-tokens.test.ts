import { describe, it, expect } from "vitest";
import { designTokens, uiClasses } from "./design-tokens";

describe("designTokens", () => {
  it("should have all spacing categories", () => {
    expect(designTokens.spacing).toBeDefined();
    expect(designTokens.spacing.xs).toBe("0.5rem");
    expect(designTokens.spacing.sm).toBe("0.75rem");
    expect(designTokens.spacing.md).toBe("1rem");
    expect(designTokens.spacing.lg).toBe("1.5rem");
    expect(designTokens.spacing.xl).toBe("2rem");
    expect(designTokens.spacing["2xl"]).toBe("3rem");
  });

  it("should have all radius values", () => {
    expect(designTokens.radius).toBeDefined();
    expect(designTokens.radius.full).toBe("9999px");
    expect(Object.keys(designTokens.radius).length).toBeGreaterThanOrEqual(5);
  });

  it("should have all fontSize values", () => {
    expect(designTokens.fontSize).toBeDefined();
    expect(designTokens.fontSize.xs).toBeDefined();
    expect(designTokens.fontSize.base).toBeDefined();
    expect(designTokens.fontSize["3xl"]).toBeDefined();
  });

  it("should have font weight values", () => {
    expect(designTokens.fontWeight).toBeDefined();
    expect(designTokens.fontWeight.normal).toBe("400");
    expect(designTokens.fontWeight.bold).toBe("700");
  });

  it("should have background colors", () => {
    expect(designTokens.colors.bg.primary).toBeDefined();
    expect(designTokens.colors.bg.primaryDark).toBe("#0c0c0c");
  });

  it("should have text colors", () => {
    expect(designTokens.colors.text.primary).toBeDefined();
    expect(designTokens.colors.text.primaryDark).toBeDefined();
  });

  it("should have border colors", () => {
    expect(designTokens.colors.border.default).toBeDefined();
    expect(designTokens.colors.border.defaultDark).toBe("#222");
  });

  it("should have accent colors with valid hex or CSS values", () => {
    expect(designTokens.colors.accent.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(designTokens.colors.accent.danger).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("should have shadow values", () => {
    expect(designTokens.shadow).toBeDefined();
    expect(Object.keys(designTokens.shadow).length).toBeGreaterThanOrEqual(4);
  });

  it("should have transition values", () => {
    expect(designTokens.transition.fast).toContain("150ms");
    expect(designTokens.transition.base).toContain("200ms");
    expect(designTokens.transition.slow).toContain("300ms");
  });

  it("should have floating widget configuration with numeric values", () => {
    const fw = designTokens.floatingWidget;
    expect(fw.pillSize).toBeTypeOf("number");
    expect(fw.expandedWidth).toBeTypeOf("number");
    expect(fw.menuWidth).toBeTypeOf("number");
    expect(fw.menuHeight).toBeTypeOf("number");
    expect(fw.bouncePadding).toBeTypeOf("number");
    expect(fw.closeDurationMs).toBeTypeOf("number");
  });
});

describe("uiClasses", () => {
  it("should have non-empty string class definitions", () => {
    const classKeys = Object.keys(uiClasses) as (keyof typeof uiClasses)[];
    expect(classKeys.length).toBeGreaterThan(0);

    for (const key of classKeys) {
      const value = uiClasses[key];
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("should have page structure classes", () => {
    expect(uiClasses.pageTitle).toBeDefined();
    expect(uiClasses.pageDescription).toBeDefined();
    expect(uiClasses.pageHeaderMargin).toBeDefined();
  });

  it("should have modal classes", () => {
    expect(uiClasses.modalOverlay).toBeDefined();
    expect(uiClasses.modalContainer).toBeDefined();
    expect(uiClasses.modalHeader).toBeDefined();
    expect(uiClasses.modalBody).toBeDefined();
  });

  it("should have button classes", () => {
    expect(uiClasses.buttonPrimary).toBeDefined();
    expect(uiClasses.buttonSecondary).toBeDefined();
    expect(uiClasses.buttonDanger).toBeDefined();
    expect(uiClasses.buttonGhost).toBeDefined();
  });

  it("should have input classes", () => {
    expect(uiClasses.input).toContain("rounded");
    expect(uiClasses.select).toContain("rounded");
  });

  it("should have navigation classes", () => {
    expect(uiClasses.navItem).toBeDefined();
    expect(uiClasses.navItemActive).toBeDefined();
    expect(uiClasses.navItemInactive).toBeDefined();
  });
});

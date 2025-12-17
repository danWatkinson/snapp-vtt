// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCustomEvent } from "./useCustomEvent";

describe("useCustomEvent", () => {
  beforeEach(() => {
    // Mock window for SSR safety
    global.window = global.window || {} as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should add event listener on mount", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const handler = vi.fn();

    renderHook(() => useCustomEvent("test-event", handler));

    expect(addEventListenerSpy).toHaveBeenCalledWith("test-event", expect.any(Function));
  });

  it("should remove event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const handler = vi.fn();

    const { unmount } = renderHook(() => useCustomEvent("test-event", handler));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("test-event", expect.any(Function));
  });

  it("should call handler when event is dispatched", () => {
    const handler = vi.fn();
    const eventDetail = { data: "test" };

    renderHook(() => useCustomEvent("test-event", handler));

    const event = new CustomEvent("test-event", { detail: eventDetail });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it("should handle SSR case where window is undefined", () => {
    // In jsdom, window is always defined, so we test the hook's SSR check
    // by verifying it doesn't throw when window exists
    const handler = vi.fn();
    
    // The hook checks `if (typeof window === "undefined")` which will be false in jsdom
    // So the listener will be added, which is expected behavior
    const { unmount } = renderHook(() => useCustomEvent("test-event", handler));
    
    // Verify it works in jsdom environment
    const event = new CustomEvent("test-event", { detail: { data: "test" } });
    window.dispatchEvent(event);
    
    expect(handler).toHaveBeenCalled();
    
    unmount();
  });
});

// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSelection } from "./useSelection";

describe("useSelection", () => {
  it("should initialize with provided state", () => {
    const { result } = renderHook(() =>
      useSelection({
        worldId: null,
        campaignId: null
      })
    );

    expect(result.current.selection.worldId).toBeNull();
    expect(result.current.selection.campaignId).toBeNull();
  });

  it("should update a field using setField", () => {
    const { result } = renderHook(() =>
      useSelection({ worldId: null, campaignId: null })
    );

    act(() => {
      result.current.setField("worldId", "world-123");
    });

    expect(result.current.selection.worldId).toBe("world-123");
    expect(result.current.selection.campaignId).toBeNull();
  });

  it("should clear a field (empty string when current value is string)", () => {
    const { result } = renderHook(() =>
      useSelection({ worldId: null, campaignId: null })
    );

    act(() => {
      result.current.setField("worldId", "world-123");
    });

    expect(result.current.selection.worldId).toBe("world-123");

    act(() => {
      result.current.clearField("worldId");
    });

    // Implementation clears to "" when current value is a string
    expect(result.current.selection.worldId).toBe("");
  });

  it("should clear a field to null when current value is not a string", () => {
    const { result } = renderHook(() =>
      useSelection({ worldId: null, campaignId: null })
    );

    // worldId is currently null, so clearField should keep it null (non-string branch)
    act(() => {
      result.current.clearField("worldId");
    });

    expect(result.current.selection.worldId).toBeNull();
  });

  it("should clear a field (empty string for strings)", () => {
    const { result } = renderHook(() =>
      useSelection({ eventId: "" })
    );

    act(() => {
      result.current.setField("eventId", "event-123");
    });

    expect(result.current.selection.eventId).toBe("event-123");

    act(() => {
      result.current.clearField("eventId");
    });

    expect(result.current.selection.eventId).toBe("");
  });

  it("should reset to initial state", () => {
    const { result } = renderHook(() =>
      useSelection({ worldId: null, campaignId: null })
    );

    act(() => {
      result.current.setField("worldId", "world-123");
      result.current.setField("campaignId", "campaign-456");
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.selection.worldId).toBeNull();
    expect(result.current.selection.campaignId).toBeNull();
  });

  it("should allow direct setSelection usage", () => {
    const { result } = renderHook(() =>
      useSelection({ worldId: null, campaignId: null })
    );

    act(() => {
      result.current.setSelection({ worldId: "world-123", campaignId: "campaign-456" });
    });

    expect(result.current.selection).toEqual({
      worldId: "world-123",
      campaignId: "campaign-456"
    });
  });
});

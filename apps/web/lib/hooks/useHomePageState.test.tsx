// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHomePageState } from "./useHomePageState";

describe("useHomePageState", () => {
  it("should initialize with default state", () => {
    const { result } = renderHook(() => useHomePageState());

    expect(result.current.activeTab).toBeNull();
    expect(result.current.activeMode).toBeNull();
    expect(result.current.planningSubTab).toBe("World Entities");
    expect(result.current.campaignView).toBeNull();
    expect(result.current.currentUser).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.authServiceUnavailable).toBe(false);
  });

  it("should provide form state hooks", () => {
    const { result } = renderHook(() => useHomePageState());

    expect(result.current.loginForm).toBeDefined();
    expect(result.current.loginForm.form).toEqual({ name: "admin", password: "" });
    expect(typeof result.current.loginForm.setField).toBe("function");

    expect(result.current.worldForm).toBeDefined();
    expect(result.current.worldForm.form).toEqual({ name: "", description: "" });

    expect(result.current.entityForm).toBeDefined();
    expect(result.current.campaignForm).toBeDefined();
    expect(result.current.sessionForm).toBeDefined();
  });

  it("should provide modal state", () => {
    const { result } = renderHook(() => useHomePageState());

    expect(result.current.modal).toBeDefined();
    expect(result.current.modal.login).toBeDefined();
    expect(result.current.modal.login.isOpen).toBe(false);
    expect(typeof result.current.modal.login.open).toBe("function");
  });

  it("should provide selection state", () => {
    const { result } = renderHook(() => useHomePageState());

    expect(result.current.selectedIds).toBeDefined();
    expect(result.current.selectedIds.worldId).toBeNull();
    expect(result.current.selectedIds.campaignId).toBeNull();
    expect(typeof result.current.setSelectionField).toBe("function");
  });

  it("should allow updating active tab", () => {
    const { result } = renderHook(() => useHomePageState());

    act(() => {
      result.current.setActiveTab("World");
    });

    expect(result.current.activeTab).toBe("World");
  });

  it("should allow updating active mode", () => {
    const { result } = renderHook(() => useHomePageState());

    act(() => {
      result.current.setActiveMode("plan");
    });

    expect(result.current.activeMode).toBe("plan");
  });

  it("should allow updating planning sub tab", () => {
    const { result } = renderHook(() => useHomePageState());

    act(() => {
      result.current.setPlanningSubTab("Campaigns");
    });

    expect(result.current.planningSubTab).toBe("Campaigns");
  });

  it("should allow updating campaign view", () => {
    const { result } = renderHook(() => useHomePageState());

    act(() => {
      result.current.setCampaignView("sessions");
    });

    expect(result.current.campaignView).toBe("sessions");
  });

  it("should allow updating current user", () => {
    const { result } = renderHook(() => useHomePageState());

    const mockUser = {
      user: { username: "testuser", roles: [] },
      token: "test-token"
    };

    act(() => {
      result.current.setCurrentUser(mockUser);
    });

    expect(result.current.currentUser).toEqual(mockUser);
  });

  it("should allow updating error state", () => {
    const { result } = renderHook(() => useHomePageState());

    act(() => {
      result.current.setError("Test error");
    });

    expect(result.current.error).toBe("Test error");
  });

  it("should allow updating loading state", () => {
    const { result } = renderHook(() => useHomePageState());

    act(() => {
      result.current.setIsLoading(true);
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("should allow updating selection", () => {
    const { result } = renderHook(() => useHomePageState());

    act(() => {
      result.current.setSelectionField("worldId", "w1");
    });

    expect(result.current.selectedIds.worldId).toBe("w1");
  });
});

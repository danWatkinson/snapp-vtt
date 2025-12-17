// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTabHelpers } from "./useTabHelpers";
import { useFormState } from "./useFormState";
import { useSelection } from "./useSelection";

describe("useTabHelpers", () => {
  it("should create form setters and values with prefixes", () => {
    const form1 = renderHook(() => useFormState({ name: "Test", email: "test@example.com" })).result.current;
    const form2 = renderHook(() => useFormState({ title: "Title" })).result.current;
    const selection = renderHook(() => useSelection({ worldId: null, campaignId: null })).result.current;

    const { result } = renderHook(() =>
      useTabHelpers({
        forms: {
          world: { form: form1, fields: ["name", "email"], prefix: "world" },
          entity: { form: form2, fields: ["title"], prefix: "entity" }
        },
        setSelectionField: selection.setField,
        openModal: () => {},
        closeModal: () => {}
      })
    );

    expect(typeof result.current.formSetters.setWorldName).toBe("function");
    expect(typeof result.current.formSetters.setWorldEmail).toBe("function");
    expect(typeof result.current.formSetters.setEntityTitle).toBe("function");
    expect(result.current.formValues.worldName).toBe("Test");
    expect(result.current.formValues.worldEmail).toBe("test@example.com");
    expect(result.current.formValues.entityTitle).toBe("Title");
  });

  it("should create selection setters", () => {
    const selection = renderHook(() => useSelection({ worldId: null, campaignId: null })).result.current;

    const { result } = renderHook(() =>
      useTabHelpers({
        forms: {},
        selections: ["worldId", "campaignId"],
        setSelectionField: selection.setField,
        openModal: () => {},
        closeModal: () => {},
        selectedIds: { worldId: "w1", campaignId: "c1" }
      })
    );

    expect(typeof result.current.selectionSetters.setSelectedWorldId).toBe("function");
    expect(typeof result.current.selectionSetters.setSelectedCampaignId).toBe("function");
    expect(result.current.selectionStates.selectedWorldId).toBe("w1");
    expect(result.current.selectionStates.selectedCampaignId).toBe("c1");
  });

  it("should default selection state to null when selectedIds entry is missing", () => {
    const selection = renderHook(() => useSelection({ worldId: null, campaignId: null })).result.current;

    const { result } = renderHook(() =>
      useTabHelpers({
        forms: {},
        selections: ["worldId"],
        setSelectionField: selection.setField,
        openModal: () => {},
        closeModal: () => {},
        selectedIds: {}
      })
    );

    expect(result.current.selectionStates.selectedWorldId).toBeNull();
  });

  it("should create modal handlers", () => {
    const openModal = () => {};
    const closeModal = () => {};
    const selection = renderHook(() => useSelection({ worldId: null })).result.current;

    const { result } = renderHook(() =>
      useTabHelpers({
        forms: {},
        modals: ["login", "createUser"],
        setSelectionField: selection.setField,
        openModal,
        closeModal,
        // Only provide explicit state for login; createUser should default to false
        modalsState: { login: true }
      })
    );

    expect(typeof result.current.modalHandlers.setLoginModalOpen).toBe("function");
    expect(typeof result.current.modalHandlers.setCreateUserModalOpen).toBe("function");
    expect(result.current.modalStates.loginModalOpen).toBe(true);
    expect(result.current.modalStates.createUserModalOpen).toBe(false);
  });

  it("should handle prefix that ends with field name", () => {
    const form = renderHook(() => useFormState({ name: "user" })).result.current;
    const selection = renderHook(() => useSelection({ worldId: null })).result.current;

    const { result } = renderHook(() =>
      useTabHelpers({
        forms: {
          user: { form, fields: ["name"], prefix: "user" }
        },
        setSelectionField: selection.setField,
        openModal: () => {},
        closeModal: () => {}
      })
    );

    // prefix "user" does not end with field name "name"; we hit the normal branch
    expect(typeof result.current.formSetters.setUserName).toBe("function");
    expect(result.current.formValues.userName).toBe("user");
  });

  it("should handle prefix that truly ends with field name", () => {
    const form = renderHook(() => useFormState({ name: "user" })).result.current;
    const selection = renderHook(() => useSelection({ worldId: null })).result.current;

    const { result } = renderHook(() =>
      useTabHelpers({
        forms: {
          username: { form, fields: ["name"], prefix: "username" }
        },
        setSelectionField: selection.setField,
        openModal: () => {},
        closeModal: () => {}
      })
    );

    // Here prefix "username" ends with "name", so we should create "setUsername" and value key "username"
    expect(typeof result.current.formSetters.setUsername).toBe("function");
    expect(result.current.formValues.username).toBe("user");
  });

  it("should return empty objects when no forms, selections, or modals provided", () => {
    const selection = renderHook(() => useSelection({ worldId: null })).result.current;

    const { result } = renderHook(() =>
      useTabHelpers({
        forms: {},
        setSelectionField: selection.setField,
        openModal: () => {},
        closeModal: () => {}
      })
    );

    expect(Object.keys(result.current.formSetters)).toHaveLength(0);
    expect(Object.keys(result.current.formValues)).toHaveLength(0);
    expect(Object.keys(result.current.selectionSetters)).toHaveLength(0);
    expect(Object.keys(result.current.modalHandlers)).toHaveLength(0);
  });
});

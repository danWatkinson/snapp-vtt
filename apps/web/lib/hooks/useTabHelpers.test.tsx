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
        modalsState: { login: true, createUser: false }
      })
    );

    expect(typeof result.current.modalHandlers.setLoginModalOpen).toBe("function");
    expect(typeof result.current.modalHandlers.setCreateUserModalOpen).toBe("function");
    expect(result.current.modalStates.loginModalOpen).toBe(true);
    expect(result.current.modalStates.createUserModalOpen).toBe(false);
  });

  it("should handle prefix that ends with field name", () => {
    const form = renderHook(() => useFormState({ username: "user" })).result.current;
    const selection = renderHook(() => useSelection({ worldId: null })).result.current;

    const { result } = renderHook(() =>
      useTabHelpers({
        forms: {
          newUser: { form, fields: ["username"], prefix: "newUser" }
        },
        setSelectionField: selection.setField,
        openModal: () => {},
        closeModal: () => {}
      })
    );

    // The logic checks if prefix.toLowerCase().endsWith(fieldName.toLowerCase())
    // "newUser" ends with "user", and "username" starts with "user", but doesn't end with it
    // So it should create "setNewUserUsername"
    expect(typeof result.current.formSetters.setNewUserUsername).toBe("function");
    expect(result.current.formValues.newUserUsername).toBe("user");
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

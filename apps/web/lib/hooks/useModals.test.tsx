// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModals } from "./useModals";

describe("useModals", () => {
  it("should initialize all modals as closed by default", () => {
    const { result } = renderHook(() => useModals());

    expect(result.current.modals.login).toBe(false);
    expect(result.current.modals.createUser).toBe(false);
    expect(result.current.modals.world).toBe(false);
  });

  it("should initialize with custom state", () => {
    const { result } = renderHook(() =>
      useModals({ login: true, world: true })
    );

    expect(result.current.modals.login).toBe(true);
    expect(result.current.modals.world).toBe(true);
    expect(result.current.modals.createUser).toBe(false);
  });

  it("should open a modal", () => {
    const { result } = renderHook(() => useModals());

    act(() => {
      result.current.openModal("login");
    });

    expect(result.current.modals.login).toBe(true);
  });

  it("should close a modal", () => {
    const { result } = renderHook(() => useModals({ login: true }));

    act(() => {
      result.current.closeModal("login");
    });

    expect(result.current.modals.login).toBe(false);
  });

  it("should toggle a modal", () => {
    const { result } = renderHook(() => useModals());

    act(() => {
      result.current.toggleModal("login");
    });

    expect(result.current.modals.login).toBe(true);

    act(() => {
      result.current.toggleModal("login");
    });

    expect(result.current.modals.login).toBe(false);
  });

  it("should close all modals", () => {
    const { result } = renderHook(() =>
      useModals({ login: true, world: true, campaign: true })
    );

    act(() => {
      result.current.closeAllModals();
    });

    expect(result.current.modals.login).toBe(false);
    expect(result.current.modals.world).toBe(false);
    expect(result.current.modals.campaign).toBe(false);
  });

  it("should provide individual modal controllers", () => {
    const { result } = renderHook(() => useModals());

    expect(result.current.modal.login.isOpen).toBe(false);

    act(() => {
      result.current.modal.login.open();
    });

    expect(result.current.modal.login.isOpen).toBe(true);

    act(() => {
      result.current.modal.login.close();
    });

    expect(result.current.modal.login.isOpen).toBe(false);

    act(() => {
      result.current.modal.login.toggle();
    });

    expect(result.current.modal.login.isOpen).toBe(true);
  });
});

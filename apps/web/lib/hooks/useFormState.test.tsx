// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormState } from "./useFormState";

describe("useFormState", () => {
  it("should initialize with provided state", () => {
    const { result } = renderHook(() =>
      useFormState({ name: "John", email: "john@example.com" })
    );

    expect(result.current.form).toEqual({
      name: "John",
      email: "john@example.com"
    });
  });

  it("should update a field using setField", () => {
    const { result } = renderHook(() =>
      useFormState({ name: "", email: "" })
    );

    act(() => {
      result.current.setField("name", "Jane");
    });

    expect(result.current.form.name).toBe("Jane");
    expect(result.current.form.email).toBe("");
  });

  it("should reset form to initial state", () => {
    const { result } = renderHook(() =>
      useFormState({ name: "John", email: "john@example.com" })
    );

    act(() => {
      result.current.setField("name", "Jane");
      result.current.setField("email", "jane@example.com");
    });

    expect(result.current.form.name).toBe("Jane");

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.form).toEqual({
      name: "John",
      email: "john@example.com"
    });
  });

  it("should reset form to custom state", () => {
    const { result } = renderHook(() =>
      useFormState({ name: "John", email: "john@example.com" })
    );

    act(() => {
      result.current.resetForm({ name: "Bob" });
    });

    expect(result.current.form.name).toBe("Bob");
    expect(result.current.form.email).toBe("john@example.com");
  });

  it("should allow direct setForm usage", () => {
    const { result } = renderHook(() =>
      useFormState({ name: "", email: "" })
    );

    act(() => {
      result.current.setForm({ name: "Alice", email: "alice@example.com" });
    });

    expect(result.current.form).toEqual({
      name: "Alice",
      email: "alice@example.com"
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { withAsyncAction } from "./useAsyncAction";

describe("useAsyncAction", () => {
  it("should set loading to true, execute action, call onSuccess, and set loading to false", async () => {
    let isLoading = false;
    let error: string | null = null;
    let successResult: any = null;

    const setIsLoading = vi.fn((loading: boolean) => {
      isLoading = loading;
    });
    const setError = vi.fn((err: string | null) => {
      error = err;
    });
    const onSuccess = vi.fn((result: string) => {
      successResult = result;
    });

    const action = vi.fn(async () => "test result");

    const result = await withAsyncAction(action, {
      setIsLoading,
      setError,
      onSuccess
    });

    expect(action).toHaveBeenCalledOnce();
    expect(setIsLoading).toHaveBeenCalledWith(true);
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(setError).toHaveBeenCalledWith(null);
    expect(onSuccess).toHaveBeenCalledWith("test result");
    expect(result).toBe("test result");
    expect(successResult).toBe("test result");
    expect(error).toBeNull();
  });

  it("should handle errors and call onError", async () => {
    let isLoading = false;
    let error: string | null = null;
    let errorCaught: Error | null = null;

    const setIsLoading = vi.fn((loading: boolean) => {
      isLoading = loading;
    });
    const setError = vi.fn((err: string | null) => {
      error = err;
    });
    const onError = vi.fn((err: Error) => {
      errorCaught = err;
    });

    const testError = new Error("Test error");
    const action = vi.fn(async () => {
      throw testError;
    });

    await expect(
      withAsyncAction(action, {
        setIsLoading,
        setError,
        onError
      })
    ).rejects.toThrow("Test error");

    expect(action).toHaveBeenCalledOnce();
    expect(setIsLoading).toHaveBeenCalledWith(true);
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(setError).toHaveBeenCalledWith("Test error");
    expect(onError).toHaveBeenCalledWith(testError);
    expect(error).toBe("Test error");
    expect(errorCaught).toBe(testError);
  });

  it("should set loading to false even if action throws", async () => {
    const setIsLoading = vi.fn();
    const setError = vi.fn();

    const action = vi.fn(async () => {
      throw new Error("Test error");
    });

    await expect(
      withAsyncAction(action, {
        setIsLoading,
        setError
      })
    ).rejects.toThrow();

    // Verify loading was set to false in finally block
    expect(setIsLoading).toHaveBeenCalledWith(false);
  });

  it("should work without onSuccess callback", async () => {
    const setIsLoading = vi.fn();
    const setError = vi.fn();
    const action = vi.fn(async () => "result");

    const result = await withAsyncAction(action, {
      setIsLoading,
      setError
    });

    expect(result).toBe("result");
    expect(setIsLoading).toHaveBeenCalledWith(true);
    expect(setIsLoading).toHaveBeenCalledWith(false);
  });

  it("should work without onError callback", async () => {
    const setIsLoading = vi.fn();
    const setError = vi.fn();
    const action = vi.fn(async () => {
      throw new Error("Test error");
    });

    await expect(
      withAsyncAction(action, {
        setIsLoading,
        setError
      })
    ).rejects.toThrow("Test error");

    expect(setError).toHaveBeenCalledWith("Test error");
  });
});

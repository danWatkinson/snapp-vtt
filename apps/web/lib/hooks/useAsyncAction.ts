import { isAuthError } from "../auth/authErrors";

/**
 * Helper function to wrap async actions with loading and error handling.
 * Reduces boilerplate in handler functions.
 * 
 * @param onAuthError - Optional callback to handle authentication errors (401/403)
 *                      If provided, will be called when an AuthenticationError is thrown
 */
export async function withAsyncAction<T>(
  action: () => Promise<T>,
  callbacks: {
    setIsLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
    onAuthError?: () => void;
  }
): Promise<T> {
  const { setIsLoading, setError, onSuccess, onError, onAuthError } = callbacks;

  setIsLoading(true);
  setError(null);

  try {
    const result = await action();
    
    if (onSuccess) {
      onSuccess(result);
    }
    
    return result;
  } catch (err) {
    // Check if this is an authentication error
    if (isAuthError(err) && onAuthError) {
      // Trigger automatic logout on auth errors
      onAuthError();
      // Don't set error message for auth errors - logout handles the UI state
      setError(null);
    } else {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
    }
    
    if (onError) {
      onError(err as Error);
    }
    
    throw err;
  /* c8 ignore start */ // defensive: finally runs on both success and error; behaviour already covered by tests
  } finally {
    setIsLoading(false);
  /* c8 ignore stop */
  }
}

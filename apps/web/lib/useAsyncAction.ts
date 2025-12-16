/**
 * Helper function to wrap async actions with loading, status, and error handling.
 * Reduces boilerplate in handler functions.
 */
export async function withAsyncAction<T>(
  action: () => Promise<T>,
  callbacks: {
    setIsLoading: (loading: boolean) => void;
    setStatus: (status: string | null) => void;
    setError: (error: string | null) => void;
    loadingMessage: string;
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
    successMessage?: (result: T) => string;
  }
): Promise<T> {
  const { setIsLoading, setStatus, setError, loadingMessage, onSuccess, onError, successMessage } = callbacks;

  setIsLoading(true);
  setStatus(loadingMessage);
  setError(null);

  try {
    const result = await action();
    
    if (onSuccess) {
      onSuccess(result);
    }
    
    if (successMessage) {
      setStatus(successMessage(result));
      setTimeout(() => setStatus(null), 3000);
    }
    
    return result;
  } catch (err) {
    const errorMessage = (err as Error).message;
    setError(errorMessage);
    setStatus(null);
    
    if (onError) {
      onError(err as Error);
    }
    
    throw err;
  } finally {
    setIsLoading(false);
  }
}

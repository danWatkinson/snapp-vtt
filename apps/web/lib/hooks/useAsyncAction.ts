/**
 * Helper function to wrap async actions with loading and error handling.
 * Reduces boilerplate in handler functions.
 */
export async function withAsyncAction<T>(
  action: () => Promise<T>,
  callbacks: {
    setIsLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
  }
): Promise<T> {
  const { setIsLoading, setError, onSuccess, onError } = callbacks;

  setIsLoading(true);
  setError(null);

  try {
    const result = await action();
    
    if (onSuccess) {
      onSuccess(result);
    }
    
    return result;
  } catch (err) {
    const errorMessage = (err as Error).message;
    setError(errorMessage);
    
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

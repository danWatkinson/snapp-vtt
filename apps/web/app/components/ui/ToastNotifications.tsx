"use client";

interface ToastNotificationsProps {
  status: string | null;
  error: string | null;
  isLoading: boolean;
  onDismissError: () => void;
}

export default function ToastNotifications({
  status,
  error,
  isLoading,
  onDismissError
}: ToastNotificationsProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {status && (
        <div
          className="rounded-lg border p-3 shadow-lg animate-in slide-in-from-bottom-2"
          style={{
            borderColor: '#6b5438',
            backgroundColor: '#faf8f3',
            boxShadow: '0 4px 12px rgba(107, 84, 56, 0.3)'
          }}
          data-testid="status-message"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">✓</span>
            <p className="text-sm font-medium" style={{ color: '#3d2817' }}>
              {status}
            </p>
          </div>
        </div>
      )}
      {error && (
        <div
          className="rounded-lg border p-3 shadow-lg animate-in slide-in-from-bottom-2"
          style={{
            borderColor: '#8b4a3a',
            backgroundColor: '#fef5f3',
            boxShadow: '0 4px 12px rgba(139, 74, 58, 0.3)'
          }}
          data-testid="error-message"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">✗</span>
            <p className="text-sm font-medium" style={{ color: '#8b4a3a' }}>
              {error}
            </p>
            <button
              onClick={onDismissError}
              className="ml-auto text-lg hover:opacity-70"
              style={{ color: '#8b4a3a' }}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {isLoading && (
        <div
          className="rounded-lg border p-3 shadow-lg"
          style={{
            borderColor: '#8b6f47',
            backgroundColor: 'rgba(244, 232, 208, 0.9)',
            boxShadow: '0 4px 12px rgba(139, 115, 85, 0.2)'
          }}
        >
          <div className="flex items-center gap-2">
            <span className="animate-spin text-lg">⟳</span>
            <p className="text-sm" style={{ color: '#5a4232' }}>
              {status || "Processing…"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

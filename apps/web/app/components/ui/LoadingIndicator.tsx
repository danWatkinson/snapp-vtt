"use client";

import { useEffect, useState } from "react";

interface LoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
}

/**
 * LoadingIndicator displays a progress bar modal while data is loading.
 * Shows a progress bar animation and optional message.
 */
export default function LoadingIndicator({ isLoading, message = "Loading..." }: LoadingIndicatorProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    // Animate progress bar from 0 to 90% while loading
    // (Never reaches 100% until loading completes)
    let startTime: number | null = null;
    const duration = 2000; // 2 seconds to reach 90%
    const targetProgress = 90;

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }
      const elapsed = timestamp - startTime;
      const currentProgress = Math.min((elapsed / duration) * targetProgress, targetProgress);
      setProgress(currentProgress);

      if (currentProgress < targetProgress && isLoading) {
        requestAnimationFrame(animate);
      }
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isLoading]);

  if (!isLoading) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
    >
      <div className="bg-white rounded-lg p-6 shadow-xl min-w-[300px] max-w-[500px] pointer-events-auto">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
        <p className="text-sm text-gray-600">Please wait while we load the required data...</p>
      </div>
    </div>
  );
}

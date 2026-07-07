import { useState, useEffect, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ErrorBoundary({ children, fallback }: Props) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      event.preventDefault();
      setError(event.error);
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  if (error) {
    if (fallback) return fallback;

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-6xl mb-4">!</div>
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => setError(null)}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

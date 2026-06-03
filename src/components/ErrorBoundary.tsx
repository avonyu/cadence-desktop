import { useRouteError, isRouteErrorResponse } from "react-router";

export function RootErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0a0a0a] text-zinc-100">
        <h1 className="text-6xl font-bold text-zinc-600">{error.status}</h1>
        <p className="mt-4 text-lg text-zinc-400">{error.statusText}</p>
        {error.data?.message && (
          <p className="mt-2 text-sm text-zinc-500">{error.data.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#0a0a0a] text-zinc-100">
      <h1 className="text-2xl font-bold text-zinc-400">Something went wrong</h1>
      <p className="mt-2 text-sm text-zinc-500">
        {error instanceof Error ? error.message : "Unknown error"}
      </p>
    </div>
  );
}

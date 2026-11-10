"use client";

import React, { useState, Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamic import of Spline to prevent SSR issues
const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#090b10] text-center">
      <div className="space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        <div className="font-mono text-xs uppercase tracking-widest text-cyan-400">
          Loading Spline 3D Scene Runtime...
        </div>
      </div>
    </div>
  ),
});

interface SplineSceneViewProps {
  sceneUrl?: string;
  onLoad?: () => void;
}

export function SplineSceneView({
  sceneUrl = "https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode",
  onLoad,
}: SplineSceneViewProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-slate-400">
        <p className="font-mono text-sm text-amber-400">Unable to load remote Spline scene.</p>
        <p className="mt-1 text-xs text-slate-500">
          Verify your network connection or provide a valid .splinecode URL.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-[#090b10]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          </div>
        }
      >
        <Spline
          scene={sceneUrl}
          onLoad={onLoad}
          onError={() => setHasError(true)}
          className="h-full w-full"
        />
      </Suspense>
    </div>
  );
}

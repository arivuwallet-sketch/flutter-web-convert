import { ClientOnly, useRouterState } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const Scene = lazy(() => import("./Scene"));

/**
 * Fixed, full-viewport 3D backdrop rendered behind every page.
 * Client-only: the WebGL canvas must never render on the server.
 */
export function ImmersiveBackground() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const dense = pathname === "/" || pathname === "/auth";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <Scene dense={dense} />
        </Suspense>
      </ClientOnly>
      <div className="absolute inset-0 bg-background/25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,color-mix(in_oklab,var(--background)_85%,transparent)_100%)]" />
    </div>
  );
}

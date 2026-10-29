"use client";

import Link, { useLinkStatus } from "next/link";
import { createPortal } from "react-dom";
import type { ComponentProps } from "react";
import { PageLoading } from "@/components/page-loading";

function NavigationProgress({ title }: { title: string }) {
  const { pending } = useLinkStatus();
  const content = pending ? document.querySelector(".private-content") : null;
  return content
    ? createPortal(
        <div className="navigation-loading">
          <PageLoading
            title={title}
            label={
              title === "Movimientos"
                ? "Cargando movimientos"
                : "Cargando pantalla"
            }
          />
        </div>,
        content,
      )
    : null;
}

export function NavigationLink({
  children,
  loadingTitle = "Cargando…",
  ...props
}: ComponentProps<typeof Link> & { loadingTitle?: string }) {
  return (
    <Link {...props}>
      {children}
      <NavigationProgress title={loadingTitle} />
    </Link>
  );
}

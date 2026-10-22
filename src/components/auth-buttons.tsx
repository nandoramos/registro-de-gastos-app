"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/modules/auth/client";
import { Button } from "./ui/button";

export function SignInButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function signIn() {
    setPending(true);
    setError(false);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/privado",
        errorCallbackURL: "/login?error=access",
      });
      if (result.error) {
        setError(true);
        setPending(false);
      }
    } catch {
      setError(true);
      setPending(false);
    }
  }
  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={signIn} disabled={pending}>
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center rounded-full bg-white text-sm font-bold text-stone-800"
        >
          G
        </span>
        {pending ? "Conectando…" : "Continuar con Google"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          No pudimos iniciar sesión. Intentá nuevamente en unos minutos.
        </p>
      )}
    </div>
  );
}
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function signOut() {
    setPending(true);
    setError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("SIGN_OUT_FAILED");
      router.replace("/login");
      router.refresh();
    } catch {
      setError(true);
      setPending(false);
    }
  }
  return (
    <div>
      <Button variant="outline" onClick={signOut} disabled={pending}>
        {pending ? "Cerrando…" : "Cerrar sesión"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-800">
          No pudimos cerrar la sesión. Intentá nuevamente.
        </p>
      )}
    </div>
  );
}

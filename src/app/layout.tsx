import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Registro de Gastos",
  description: "Tu registro personal de gastos.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-UY">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}

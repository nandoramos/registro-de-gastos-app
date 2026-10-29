"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { SignOutButton } from "@/components/auth-buttons";

const primary = [
  { label: "Inicio", href: "/privado" },
  { label: "Movimientos", href: "/privado/historial" },
  { label: "Registrar gasto", href: "/privado/gastos/nuevo" },
  { label: "Registrar ingreso", href: "/privado/ingresos/nuevo" },
  { label: "Registrar transferencia / retiro", href: "/privado/transferencias/nueva" },
  { label: "Ajuste manual", href: "/privado/ajustes/nuevo" },
  { label: "Cuentas", href: "/privado/cuentas" },
  { label: "Configurar categorías", href: "/privado/categorias" },
  { label: "Configuraciones", href: "/privado/configuraciones" },
];
const existing = [
  { label: "Pendientes", href: "/privado/pendientes" },
  { label: "Registrar conversión", href: "/privado/conversiones/nueva" },
  { label: "Resumen mensual", href: "/privado/resumen" },
  { label: "Ingresar texto de email", href: "/privado/emails/nuevo" },
  { label: "Probar interpretación", href: "/privado/probar-interpretacion" },
  { label: "Descartadas", href: "/privado/descartadas" },
  { label: "Anulados", href: "/privado/anulados" },
];

function Menu({ name, close }: { name: string; close?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label={name} className="private-nav">
    <Link href="/privado" onClick={close} className="private-brand">Registro de Gastos</Link>
    <p className="private-nav-heading">Tu espacio</p>
    <ul className="private-nav-list">
      {primary.map((item) => <li key={item.label}>{item.href ? <Link className="private-nav-link" href={item.href} onClick={close} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link> : <span className="private-nav-unavailable">{item.label}<span>Próximamente</span></span>}</li>)}
    </ul>
    <p className="private-nav-heading">Herramientas actuales</p>
    <ul className="private-nav-list">
      {existing.map((item) => <li key={item.href}><Link className="private-nav-link" href={item.href} onClick={close} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link></li>)}
    </ul>
    <div className="private-signout"><SignOutButton /></div>
  </nav>;
}

export function PrivateNavigation() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  function close() {
    setOpen(false);
    toggle.current?.focus();
  }
  return <>
    <aside className="private-desktop"><Menu name="Navegación principal" /></aside>
    <div className="private-mobile" onKeyDown={(event) => { if (event.key === "Escape" && open) close(); }}>
      <header className="private-mobile-header"><span>Registro de Gastos</span><button ref={toggle} type="button" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? "✕" : "☰"}</button></header>
      <div id="mobile-navigation" hidden={!open}><Menu name="Menú móvil" close={close} /></div>
    </div>
  </>;
}

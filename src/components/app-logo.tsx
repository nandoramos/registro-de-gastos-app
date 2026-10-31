import Image from "next/image";

export function AppLogo({ width = 216 }: { width?: number }) {
  return (
    <Image
      src="/registro-de-gastos-logo.png"
      alt="Registro de Gastos"
      width={width}
      height={width / 3}
      loading="eager"
      className="app-logo"
    />
  );
}

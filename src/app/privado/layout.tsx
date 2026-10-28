import { PrivateNavigation } from "@/components/private-navigation";

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <div className="private-shell"><PrivateNavigation /><div className="private-content">{children}</div></div>;
}

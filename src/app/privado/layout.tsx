import { PrivateNavigation } from "@/components/private-navigation";
import { CategoryCacheProvider } from "@/components/category-cache";

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <CategoryCacheProvider><div className="private-shell"><PrivateNavigation /><div className="private-content">{children}</div></div></CategoryCacheProvider>;
}

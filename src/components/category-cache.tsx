"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CategoryCache,
  emptyCategorySnapshot,
} from "@/modules/categories/cache";

const Context = createContext<CategoryCache | null>(null);
export const useOptionalCategoryCache = () => useContext(Context);

export function CategoryCacheProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cache] = useState(() => new CategoryCache());
  useEffect(() => {
    const refresh = () => {
      const { userId } = cache.getSnapshot();
      if (userId && document.visibilityState === "visible")
        void cache.load(userId, true);
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      cache.clear();
    };
  }, [cache]);
  return <Context.Provider value={cache}>{children}</Context.Provider>;
}

export function useCategories(userId: string) {
  const cache = useOptionalCategoryCache();
  if (!cache) throw new Error("CategoryCacheProvider is required");
  const snapshot = useSyncExternalStore(
    cache.subscribe,
    cache.getSnapshot,
    cache.getServerSnapshot,
  );
  useEffect(() => {
    void cache.load(userId);
  }, [cache, userId]);
  const scoped = snapshot.userId === userId ? snapshot : emptyCategorySnapshot;
  return {
    ...scoped,
    refresh: (restart = false) => cache.refresh(userId, restart),
    save: (url: string, options: RequestInit) =>
      cache.save(userId, url, options),
  };
}

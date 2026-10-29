import type { CategoryView } from "./domain";

export type CategorySnapshot = {
  userId: string | null;
  categories?: CategoryView[];
  loading: boolean;
  error: boolean;
};
export const emptyCategorySnapshot: CategorySnapshot = {
  userId: null,
  loading: false,
  error: false,
};

function categoryFromJson(value: CategoryView): CategoryView {
  if (!value || typeof value.id !== "string" || typeof value.name !== "string")
    throw new Error("INVALID_RESPONSE");
  return {
    ...value,
    archivedAt: value.archivedAt ? new Date(value.archivedAt) : null,
  };
}

// One instance per mounted private area; no global or persistent user data.
export class CategoryCache {
  private snapshot: CategorySnapshot = emptyCategorySnapshot;
  private listeners = new Set<() => void>();
  private generation = 0;
  private readVersion = 0;
  private operation = 0;
  private lastMutation = new Map<string, number>();
  private inflight?: {
    version: number;
    controller: AbortController;
    promise: Promise<void>;
  };

  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => emptyCategorySnapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(snapshot: CategorySnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
  clear = () => {
    this.generation++;
    this.cancelRead();
    this.lastMutation.clear();
    this.publish(emptyCategorySnapshot);
  };
  private cancelRead() {
    this.readVersion++;
    this.inflight?.controller.abort();
    this.inflight = undefined;
  }
  private deny(userId: string) {
    this.clear();
    this.publish({ userId, loading: false, error: true });
  }

  refresh = (userId: string, restart = false) => {
    if (this.snapshot.userId !== userId) return Promise.resolve();
    if (restart) this.cancelRead();
    return this.load(userId, true);
  };

  load = (userId: string, force = false): Promise<void> => {
    if (this.snapshot.userId !== userId) {
      this.clear();
      this.publish({ userId, loading: false, error: false });
    }
    if (this.inflight) return this.inflight.promise;
    if (this.snapshot.categories && !force) return Promise.resolve();
    const version = ++this.readVersion;
    const controller = new AbortController();
    const current = () =>
      this.readVersion === version && this.snapshot.userId === userId;
    const promise = Promise.resolve().then(async () => {
      if (!current()) return;
      try {
        const response = await fetch("/api/categories?includeArchived=true", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!current()) return;
        if (response.status === 401 || response.status === 403) {
          this.deny(userId);
          return;
        }
        if (!response.ok) throw new Error("LOAD_FAILED");
        const body = await response.json();
        if (!current()) return;
        if (body.userId !== userId) {
          this.deny(userId);
          return;
        }
        if (!Array.isArray(body.categories))
          throw new Error("INVALID_RESPONSE");
        this.publish({
          userId,
          categories: body.categories.map(categoryFromJson),
          loading: false,
          error: false,
        });
      } catch {
        if (current())
          this.publish({ ...this.snapshot, loading: false, error: true });
      } finally {
        if (this.inflight?.version === version) this.inflight = undefined;
      }
    });
    this.inflight = { version, controller, promise };
    this.publish({ ...this.snapshot, loading: true, error: false });
    return promise;
  };

  save = async (
    userId: string,
    url: string,
    options: RequestInit,
  ): Promise<CategoryView> => {
    if (this.snapshot.userId !== userId || !this.snapshot.categories)
      throw new Error("CATEGORIES_UNAVAILABLE");
    const generation = this.generation;
    const operation = ++this.operation;
    const response = await fetch(url, options);
    const current = () =>
      this.generation === generation && this.snapshot.userId === userId;
    if ((response.status === 401 || response.status === 403) && current())
      this.deny(userId);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    if (current() && response.headers.get("X-Category-User") !== userId) {
      this.deny(userId);
      throw new Error("CATEGORIES_UNAVAILABLE");
    }
    const category = categoryFromJson(body);
    if (current() && operation > (this.lastMutation.get(category.id) ?? 0)) {
      this.lastMutation.set(category.id, operation);
      this.cancelRead();
      const categories = [
        ...this.snapshot.categories!.filter((item) => item.id !== category.id),
        category,
      ].sort((a, b) => a.name.localeCompare(b.name, "es"));
      this.publish({ userId, categories, loading: false, error: false });
    }
    return category;
  };
}

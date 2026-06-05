export type StoreSetter<T> = {
  (partial: Partial<T> | ((state: T) => Partial<T>), replace?: false | undefined): void;
  (state: T | ((state: T) => T), replace: true): void;
};

export type StoreGetter<T> = () => T;

export function flattenActions<T>(instances: InstanceType<any>[]): T {
  const result: Record<string, unknown> = {};
  for (const instance of instances) {
    const proto = Object.getPrototypeOf(instance);
    const allKeys = [
      ...Object.keys(instance),
      ...Object.getOwnPropertyNames(proto).filter(
        (k) => k !== "constructor" && typeof proto[k] === "function",
      ),
    ];
    for (const key of allKeys) {
      if (typeof instance[key] === "function") {
        result[key] = (instance[key] as Function).bind(instance);
      } else if (key in instance) {
        result[key] = instance[key];
      }
    }
  }
  return result as T;
}
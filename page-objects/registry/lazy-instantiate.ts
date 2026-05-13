/**
 * Creates a lazy-loading proxy for instantiating classes on demand.
 * Only creates instances when properties are first accessed.
 *
 * @param ctx - Context object passed to class constructors
 * @param module - Object containing class constructors
 * @returns Proxy that lazily instantiates classes on property access
 */
export function lazyInstantiate<
  Ctx,
  T extends Record<string, new (ctx: Ctx) => any>,
>(
  ctx: Ctx,
  module: T,
): {
  [K in keyof T]: InstanceType<T[K]>;
} {
  // Use Map for caching instances when properties are first accessed
  const cache = new Map<keyof T, any>();

  return new Proxy({} as { [K in keyof T]: InstanceType<T[K]> }, {
    get(_target, prop: string | symbol): any {
      if (typeof prop !== "string" || !(prop in module)) {
        return undefined;
      }

      const propKey = prop as keyof T;

      // Check cache first
      if (cache.has(propKey)) {
        return cache.get(propKey);
      }

      const ClassRef = module[propKey];

      // Check the property
      if (typeof ClassRef !== "function") {
        throw new Error(
          `Property '${prop}' is not a class constructor. Expected function, got ${typeof ClassRef}`,
        );
      }

      try {
        // Instantiate and cache the result
        const instance = new ClassRef(ctx);
        cache.set(propKey, instance);
        return instance;
      } catch (error) {
        throw new Error(
          `Failed to instantiate class '${prop}': ${error instanceof Error ? error.message : error}`,
        );
      }
    },

    has(_target, prop: string | symbol): boolean {
      return typeof prop === "string" && prop in module;
    },

    ownKeys(_target): (string | symbol)[] {
      return Object.keys(module);
    },

    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      if (typeof prop === "string" && prop in module) {
        return {
          configurable: true,
          enumerable: true,
          get: () => this.get!(_target as any, prop, _target),
        };
      }
      return undefined;
    },
  });
}

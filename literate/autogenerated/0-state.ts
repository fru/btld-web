// AUTOGENERATED
// The original file is [literate/0-state.md](https://github.com/fru/btld/blob/main/literate/0-state.md)
// Please do not edit this file directly

function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

function shallowCloneObject(value: object): object {
  if (Array.isArray(value)) return value.slice(0);
  return Object.assign({}, value);
}

type ObjectCache = Map<object, object>;

function createProxyCached(frozen: object, proxies: ObjectCache) {
  if (!proxies.has(frozen)) {
    proxies.set(frozen, createProxy(frozen, proxies));
  }
  return proxies.get(frozen)!;
}
const unchanged = Symbol('unchanged');

function createProxy(frozen: object, proxies: ObjectCache) {
  let clone = shallowCloneObject(frozen);
  clone[unchanged] = frozen;

  return new Proxy(clone, {
    setPrototypeOf: () => false, // Disallow prototype

    // Write traps:
    set: function (target) {
      target[unchanged] = false;
      // @ts-ignore: next-line
      return Reflect.set(...arguments);
    },
    deleteProperty: function (target) {
      target[unchanged] = false;
      // @ts-ignore: next-line
      return Reflect.deleteProperty(...arguments);
    },

    // Read trap:
    get: function (target, p) {
      if (p === unchanged) return target[p];
      if (target[p] !== frozen[p]) return target[p];
      // Functions are still returned frozen
      if (!isObject(target[p])) return target[p];
      return createProxyCached(frozen[p], proxies);
    },
  });
}
function normalizeUnchangedMarker(root: object) {
  const changedDirectly = new Set<object>();
  const stopIterating = new Set();
  // One object can have many parents
  const childToParents = new Map<object, object[]>();

  (function fillMappings(val: object) {
    if (val && !val[unchanged]) changedDirectly.add(val);
    stopIterating.add(val);

    for (var p in val) {
      let child = val[p];
      if (!isUnfrozenObject(child)) continue;
      // Fill parent map
      if (!childToParents.has(child)) childToParents.set(child, []);
      childToParents.get(child)!.push(val);
      // Recurse
      if (!stopIterating.has(child)) fillMappings(child);
    }
  })(root);

  function normalizeIterateParents(changed: object) {
    let parents = childToParents.get(changed) || [];
    for (let parent of parents) {
      if (!parent[unchanged]) continue;
      parent[unchanged] = false;
      normalizeIterateParents(parent);
    }
  }
  changedDirectly.forEach(normalizeIterateParents);
}
const frozen = Symbol('frozen');

function isUnfrozenObject(val: unknown): val is object {
  return isObject(val) && !val[frozen];
}

function freeze(root: object) {
  normalizeUnchangedMarker(root);
  const cloneCache = new Map();
  const result = cloneChanged(root, cloneCache);

  cloneCache.forEach(obj => {
    obj[frozen] = true;
    Object.freeze(obj);
  });
  return result;
}

function cloneChanged(val: unknown, cloneCache: ObjectCache) {
  // Simple Cases - No cloning needed
  if (typeof val === 'function') return Object.freeze(val);
  if (!isUnfrozenObject(val)) return val;
  if (val[unchanged]) return val[unchanged];
  if (val instanceof Date) return val.toISOString();
  if (cloneCache.has(val)) return cloneCache.get(val);

  // Clone and recurse
  const cloned = shallowCloneObject(val);
  cloneCache.set(val, cloned);
  for (var prop in cloned) {
    cloned[prop] = cloneChanged(cloned[prop], cloneCache);
  }
  return cloned;
}
type UpdateAction = (data: object) => void;

abstract class MinimalState {
  _frozen = freeze({});
  getRoot = () => this._frozen;
  updateRoot(action: UpdateAction): void {
    const root = createProxyCached(this._frozen, new Map());
    action(root);
    this._frozen = freeze(root);
    if (this.listener) this.listener();
  }
  abstract listener(): void;
}
export class State extends MinimalState {
  get(path: string) {
    return parsePath(path).get(this._frozen);
  }
  set(path: string, value: unknown) {
    this.updateRoot(data => {
      const { writable, prop } = parsePath(path).create(data);
      writable[prop] = value;
    });
  }
  update(path: string, action: UpdateAction): void {
    this.updateRoot(data => {
      const { writable, prop } = parsePath(path).create(data);
      if (!writable[prop]) writable[prop] = {};
      action(writable[prop]);
    });
  }
  _watchers: { get: PathGetter; cb: Function; prev: unknown }[] = [];
  watch(path: string, callback: Function) {
    const { get } = parsePath(path);
    this._watchers.push({ get, cb: callback, prev: get(this._frozen) });
  }
  listener(): void {
    let invoke = new Set<Function>();
    for (let { get, cb, prev } of this._watchers) {
      if (prev !== get(this._frozen)) invoke.add(cb);
    }
    invoke.forEach(f => invokeAndLogError(f));
  }
}

function invokeAndLogError(callback: Function) {
  try {
    callback();
  } catch (e) {
    console.error(e);
  }
}
type PathGetter = (o: unknown) => unknown;

function parsePath(path: string) {
  return {
    get: function (o: unknown): unknown {
      // TODO
      return undefined;
    },
    create: function (o: unknown) {
      // TODO
      return { writable: {}, prop: 2 };
    },
  };
}

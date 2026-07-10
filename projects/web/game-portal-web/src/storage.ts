const managedPrefixes = ["game-shelf-"];

export function repairCorruptedJsonStorage() {
  try {
    const invalidKeys: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !managedPrefixes.some((prefix) => key.startsWith(prefix))) {
        continue;
      }

      const value = window.localStorage.getItem(key)?.trim();
      if (!value || (!value.startsWith("{") && !value.startsWith("["))) {
        continue;
      }

      try {
        JSON.parse(value);
      } catch {
        invalidKeys.push(key);
      }
    }

    invalidKeys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage may be unavailable in a restricted browser context. Games still run
    // without persistence, so startup should continue.
  }
}

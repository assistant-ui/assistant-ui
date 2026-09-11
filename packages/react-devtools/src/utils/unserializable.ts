export const UNSERIALIZABLE = "[Unserializable]";

export const readProperty = (value: object, key: PropertyKey): unknown => {
  try {
    return Reflect.get(value, key);
  } catch {
    return UNSERIALIZABLE;
  }
};

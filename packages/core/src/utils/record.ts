export const createNullProtoRecord = <T>(): Record<string, T> =>
  Object.create(null) as Record<string, T>;

export const cloneNullProtoRecord = <T>(
  record: Record<string, T>,
): Record<string, T> => Object.assign(createNullProtoRecord<T>(), record);

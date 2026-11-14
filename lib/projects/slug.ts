export function isProjectSlug(value: string): boolean {
  return value.length <= 100 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

/**
 * Utility function to conditionally join CSS class names.
 * Similar to clsx, but simpler and built without external dependencies.
 */
export function cn(
  ...classes: (string | boolean | null | undefined | Record<string, boolean>)[]
): string {
  return classes
    .flatMap((cls) => {
      if (!cls) return [];
      if (typeof cls === 'string') return cls;
      if (typeof cls === 'object') return Object.entries(cls).filter(([, v]) => v).map(([k]) => k);
      return [];
    })
    .join(' ');
}
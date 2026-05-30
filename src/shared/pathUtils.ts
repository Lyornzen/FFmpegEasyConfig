/**
 * Join a directory and filename using the correct OS separator.
 * Detects separator from the directory string (for mixed Windows paths).
 */
export function joinPath(dir: string, filename: string): string {
  const sep = dir.includes('\\') ? '\\' : '/';
  return `${dir}${dir.endsWith(sep) || dir.endsWith('/') || dir.endsWith('\\') ? '' : sep}${filename}`;
}

/**
 * Get the separator character from a directory path.
 */
export function pathSep(dir: string): string {
  return dir.includes('\\') ? '\\' : '/';
}

/**
 * Path Transformer - Cross-platform path normalization
 *
 * Provides utilities for converting paths between different formats
 * and platforms for configuration portability.
 */

import * as path from 'node:path';
import * as os from 'node:os';

// ============================================================================
// Types
// ============================================================================

/**
 * Classification of path types for transformation logic
 */
export type PathType = 'workspace-relative' | 'home-relative' | 'absolute' | 'url';

/**
 * Result of path transformation with metadata
 */
export interface TransformResult {
  /** The transformed path */
  path: string;
  /** Original path type */
  originalType: PathType;
  /** Whether transformation was successful */
  success: boolean;
  /** Warning message if transformation had issues */
  warning?: string;
}

/**
 * Options for path transformation
 */
export interface PathTransformOptions {
  /** Whether to preserve absolute paths that can't be converted */
  preserveAbsolute?: boolean;
  /** Custom home directory (defaults to os.homedir()) */
  homeDir?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Portable prefix for home-relative paths */
const HOME_PREFIX = '~/';

/** Portable prefix for workspace-relative paths */
const WORKSPACE_PREFIX = './';

/** URL protocols that indicate a URL path type */
const URL_PROTOCOLS = ['http:', 'https:', 'file:', 'ftp:', 'ssh:', 'git:'];

// ============================================================================
// Path Type Detection
// ============================================================================

/**
 * Detects the type of a given path
 *
 * @param pathStr - The path string to analyze
 * @returns The detected path type
 *
 * @example
 * ```typescript
 * detectPathType('./src/config.json');        // 'workspace-relative'
 * detectPathType('~/Documents/file.txt');     // 'home-relative'
 * detectPathType('/etc/config');              // 'absolute'
 * detectPathType('https://example.com');      // 'url'
 * ```
 */
export function detectPathType(pathStr: string): PathType {
  if (!pathStr || typeof pathStr !== 'string') {
    return 'workspace-relative';
  }

  const trimmed = pathStr.trim();

  // Check for URL protocols
  for (const protocol of URL_PROTOCOLS) {
    if (trimmed.toLowerCase().startsWith(protocol)) {
      return 'url';
    }
  }

  // Check for home-relative paths
  if (trimmed.startsWith('~') || trimmed.startsWith(HOME_PREFIX)) {
    return 'home-relative';
  }

  // Check for workspace-relative paths
  if (trimmed.startsWith('./') || trimmed.startsWith('../') || !path.isAbsolute(trimmed)) {
    // Paths that don't start with / or drive letter are relative
    if (!path.isAbsolute(trimmed)) {
      return 'workspace-relative';
    }
  }

  // Check for absolute paths (Unix or Windows)
  if (path.isAbsolute(trimmed)) {
    return 'absolute';
  }

  // Default to workspace-relative for anything else
  return 'workspace-relative';
}

// ============================================================================
// Path Conversion - To Portable Format
// ============================================================================

/**
 * Converts a platform-specific path to portable POSIX format
 *
 * Transformation rules:
 * - Workspace paths: Store as `./relative/path`
 * - Home paths: Store as `~/relative/path`
 * - Absolute paths: Convert to workspace-relative if possible
 * - URLs: Keep as-is
 * - Windows: Convert backslashes to forward slashes
 *
 * @param inputPath - The path to convert
 * @param rootPath - The workspace root path for relative conversion
 * @param options - Optional transformation options
 * @returns The portable path string
 *
 * @example
 * ```typescript
 * toPortablePath('/workspace/project/src/file.ts', '/workspace/project');
 * // Returns: './src/file.ts'
 *
 * toPortablePath('C:\\Users\\name\\project\\src\\file.ts', 'C:\\Users\\name\\project');
 * // Returns: './src/file.ts'
 *
 * toPortablePath('/home/user/.config/app.json', '/workspace', { homeDir: '/home/user' });
 * // Returns: '~/.config/app.json'
 * ```
 */
export function toPortablePath(
  inputPath: string,
  rootPath: string,
  options: PathTransformOptions = {}
): string {
  if (!inputPath || typeof inputPath !== 'string') {
    return '';
  }

  const { preserveAbsolute = false, homeDir = os.homedir() } = options;

  // Normalize input (convert Windows backslashes)
  const normalizedInput = normalizeSeparators(inputPath.trim());

  // Detect path type
  const pathType = detectPathType(normalizedInput);

  // URLs: Keep as-is
  if (pathType === 'url') {
    return normalizedInput;
  }

  // Already home-relative: Normalize separators only
  if (pathType === 'home-relative') {
    if (normalizedInput.startsWith('~')) {
      return normalizedInput;
    }
  }

  // Normalize the root path
  const normalizedRoot = path.resolve(rootPath);

  // Resolve the input to absolute for comparison
  let absoluteInput: string;
  if (path.isAbsolute(normalizedInput)) {
    absoluteInput = path.resolve(normalizedInput);
  } else {
    // Relative path - resolve against root
    absoluteInput = path.resolve(normalizedRoot, normalizedInput);
  }

  // Check if path is under home directory
  const normalizedHome = path.resolve(homeDir);
  if (isPathUnder(absoluteInput, normalizedHome)) {
    const relativePath = path.relative(normalizedHome, absoluteInput);
    return HOME_PREFIX + normalizeSeparators(relativePath);
  }

  // Check if path is under workspace root
  if (isPathUnder(absoluteInput, normalizedRoot)) {
    const relativePath = path.relative(normalizedRoot, absoluteInput);
    const portable = normalizeSeparators(relativePath);
    // Ensure it starts with ./
    return portable.startsWith('.') ? portable : WORKSPACE_PREFIX + portable;
  }

  // Path is outside both home and workspace
  if (preserveAbsolute) {
    return normalizeSeparators(absoluteInput);
  }

  // Return as normalized path with warning (caller should handle)
  return normalizeSeparators(absoluteInput);
}

/**
 * Extended version that returns transformation metadata
 */
export function toPortablePathWithInfo(
  inputPath: string,
  rootPath: string,
  options: PathTransformOptions = {}
): TransformResult {
  if (!inputPath || typeof inputPath !== 'string') {
    return {
      path: '',
      originalType: 'workspace-relative',
      success: false,
      warning: 'Empty or invalid input path',
    };
  }

  const originalType = detectPathType(inputPath);
  const portablePath = toPortablePath(inputPath, rootPath, options);
  const resultType = detectPathType(portablePath);

  // Determine if transformation was successful
  let success = true;
  let warning: string | undefined;

  if (resultType === 'absolute' && !options.preserveAbsolute) {
    success = false;
    warning = `Path "${inputPath}" could not be converted to relative format`;
  }

  return {
    path: portablePath,
    originalType,
    success,
    warning,
  };
}

// ============================================================================
// Path Conversion - From Portable Format
// ============================================================================

/**
 * Converts a portable POSIX path to platform-specific format
 *
 * @param portablePath - The portable path (using forward slashes)
 * @param targetRoot - The target workspace root path
 * @param options - Optional transformation options
 * @returns The platform-specific absolute path
 *
 * @example
 * ```typescript
 * fromPortablePath('./src/file.ts', '/workspace/project');
 * // Returns: '/workspace/project/src/file.ts'
 *
 * fromPortablePath('~/config/app.json', '/workspace');
 * // Returns: '/home/user/config/app.json' (on Unix)
 * ```
 */
export function fromPortablePath(
  portablePath: string,
  targetRoot: string,
  options: PathTransformOptions = {}
): string {
  if (!portablePath || typeof portablePath !== 'string') {
    return '';
  }

  const { homeDir = os.homedir() } = options;
  const trimmed = portablePath.trim();

  // URLs: Keep as-is
  if (detectPathType(trimmed) === 'url') {
    return trimmed;
  }

  // Home-relative paths
  if (trimmed.startsWith('~')) {
    const withoutTilde = trimmed.slice(1).replace(/^[/\\]/, '');
    return path.join(homeDir, withoutTilde);
  }

  // Workspace-relative paths
  if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
    const withoutPrefix = trimmed.replace(/^\.\//, '');
    return path.resolve(targetRoot, withoutPrefix);
  }

  // Already absolute - just normalize
  if (path.isAbsolute(trimmed)) {
    return path.resolve(trimmed);
  }

  // Treat as workspace-relative by default
  return path.resolve(targetRoot, trimmed);
}

/**
 * Extended version that returns transformation metadata
 */
export function fromPortablePathWithInfo(
  portablePath: string,
  targetRoot: string,
  options: PathTransformOptions = {}
): TransformResult {
  if (!portablePath || typeof portablePath !== 'string') {
    return {
      path: '',
      originalType: 'workspace-relative',
      success: false,
      warning: 'Empty or invalid portable path',
    };
  }

  const originalType = detectPathType(portablePath);
  const platformPath = fromPortablePath(portablePath, targetRoot, options);

  return {
    path: platformPath,
    originalType,
    success: true,
  };
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Transforms multiple paths to portable format
 *
 * @param paths - Array of paths to transform
 * @param rootPath - The workspace root path
 * @param options - Optional transformation options
 * @returns Array of transformed paths with metadata
 */
export function toPortablePaths(
  paths: string[],
  rootPath: string,
  options: PathTransformOptions = {}
): TransformResult[] {
  return paths.map(p => toPortablePathWithInfo(p, rootPath, options));
}

/**
 * Transforms multiple portable paths to platform-specific format
 *
 * @param paths - Array of portable paths to transform
 * @param targetRoot - The target workspace root path
 * @param options - Optional transformation options
 * @returns Array of transformed paths with metadata
 */
export function fromPortablePaths(
  paths: string[],
  targetRoot: string,
  options: PathTransformOptions = {}
): TransformResult[] {
  return paths.map(p => fromPortablePathWithInfo(p, targetRoot, options));
}

// ============================================================================
// Object Path Transformation
// ============================================================================

/**
 * Keys that commonly contain file paths
 */
const PATH_KEYS = new Set([
  'path',
  'file',
  'filePath',
  'rootPath',
  'outputDir',
  'workingDirectory',
  'cwd',
  'directory',
  'dir',
  'source',
  'target',
  'destination',
  'configPath',
  'themePath',
]);

/**
 * Recursively transforms all path-like values in an object to portable format
 *
 * @param obj - The object containing paths
 * @param rootPath - The workspace root path
 * @param options - Optional transformation options
 * @returns A new object with transformed paths
 */
export function transformObjectPaths<T extends object>(
  obj: T,
  rootPath: string,
  options: PathTransformOptions = {}
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'object' && item !== null) {
        return transformObjectPaths(item, rootPath, options);
      }
      return item;
    }) as unknown as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value === 'string' && isPathKey(key)) {
      result[key] = toPortablePath(value, rootPath, options);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return transformObjectPaths(item as object, rootPath, options);
        }
        if (typeof item === 'string' && isPathKey(key)) {
          return toPortablePath(item, rootPath, options);
        }
        return item;
      });
    } else if (typeof value === 'object') {
      result[key] = transformObjectPaths(value as object, rootPath, options);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Recursively transforms all portable paths in an object to platform-specific format
 *
 * @param obj - The object containing portable paths
 * @param targetRoot - The target workspace root path
 * @param options - Optional transformation options
 * @returns A new object with platform-specific paths
 */
export function restoreObjectPaths<T extends object>(
  obj: T,
  targetRoot: string,
  options: PathTransformOptions = {}
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'object' && item !== null) {
        return restoreObjectPaths(item, targetRoot, options);
      }
      return item;
    }) as unknown as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value === 'string' && isPathKey(key)) {
      result[key] = fromPortablePath(value, targetRoot, options);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return restoreObjectPaths(item as object, targetRoot, options);
        }
        if (typeof item === 'string' && isPathKey(key)) {
          return fromPortablePath(item, targetRoot, options);
        }
        return item;
      });
    } else if (typeof value === 'object') {
      result[key] = restoreObjectPaths(value as object, targetRoot, options);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalizes path separators to forward slashes (POSIX style)
 *
 * @param inputPath - The path to normalize
 * @returns Path with forward slashes
 */
export function normalizeSeparators(inputPath: string): string {
  if (!inputPath) {
    return '';
  }
  return inputPath.replace(/\\/g, '/');
}

/**
 * Checks if a path is under another path
 *
 * @param childPath - The potential child path
 * @param parentPath - The potential parent path
 * @returns True if childPath is under parentPath
 */
export function isPathUnder(childPath: string, parentPath: string): boolean {
  const normalizedChild = path.resolve(childPath);
  const normalizedParent = path.resolve(parentPath);

  // Ensure parent path ends with separator for proper comparison
  const parentWithSep = normalizedParent.endsWith(path.sep)
    ? normalizedParent
    : normalizedParent + path.sep;

  return (
    normalizedChild === normalizedParent ||
    normalizedChild.startsWith(parentWithSep)
  );
}

/**
 * Checks if a key is likely to contain a path value
 *
 * @param key - The object key to check
 * @returns True if the key likely contains a path
 */
export function isPathKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return (
    PATH_KEYS.has(key) ||
    lowerKey.endsWith('path') ||
    lowerKey.endsWith('dir') ||
    lowerKey.endsWith('directory') ||
    lowerKey.endsWith('file') ||
    lowerKey.startsWith('path') ||
    lowerKey.startsWith('dir')
  );
}

/**
 * Gets the platform identifier for exports
 *
 * @returns The platform string (darwin, linux, win32)
 */
export function getPlatform(): NodeJS.Platform {
  return process.platform;
}

/**
 * Validates that a portable path is in correct format
 *
 * @param portablePath - The path to validate
 * @returns True if the path is valid portable format
 */
export function isValidPortablePath(portablePath: string): boolean {
  if (!portablePath || typeof portablePath !== 'string') {
    return false;
  }

  const trimmed = portablePath.trim();

  // URLs are valid
  if (detectPathType(trimmed) === 'url') {
    return true;
  }

  // Check for Windows-style paths (backslashes or drive letters)
  if (trimmed.includes('\\')) {
    return false;
  }

  // Check for Windows drive letters (C:, D:, etc.)
  if (/^[a-zA-Z]:/.test(trimmed)) {
    return false;
  }

  // Valid portable paths:
  // - Start with ~/
  // - Start with ./
  // - Start with ../
  // - Are relative paths without leading /
  // - Are URLs
  const validPrefixes = ['~/', './', '../'];
  if (validPrefixes.some(prefix => trimmed.startsWith(prefix))) {
    return true;
  }

  // Absolute Unix paths are also valid (but should be avoided)
  if (trimmed.startsWith('/')) {
    return true;
  }

  // Relative paths without prefix
  if (!path.isAbsolute(trimmed)) {
    return true;
  }

  return false;
}

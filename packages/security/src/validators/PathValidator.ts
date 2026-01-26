/**
 * Path Validator - Prevents path traversal attacks
 *
 * Validates and sanitizes file paths to prevent directory traversal
 * and unauthorized file access.
 *
 * Performance: <50ms for path validation
 */

import { resolve, normalize, isAbsolute, sep } from 'path';
import { PathValidationOptions } from '../utils/types.js';

export class PathValidator {

  /**
   * Validate and sanitize a file path
   * @param path - Path to validate
   * @param options - Validation options
   * @returns Sanitized absolute path
   * @throws Error if path is invalid or traverses outside allowed directories
   */
  static validate(path: string, options: PathValidationOptions = {}): string {
    const {
      allowAbsolute = true,
      allowTraversal = false,
      allowedDirectories = [],
      maxDepth = 10
    } = options;

    // Check for empty path
    if (!path || path.trim().length === 0) {
      throw new Error('Path cannot be empty');
    }

    // Check for traversal patterns first
    if (!allowTraversal && (path.includes('..') || path.includes('~/'))) {
      throw new Error('Path traversal detected');
    }

    // Check for null bytes and invalid characters
    if (/\0/.test(path) || /[<>:"|?*]/.test(path)) {
      throw new Error('Path contains invalid characters');
    }

    // Normalize the path
    const normalizedPath = normalize(path);

    // Resolve to absolute path
    const absolutePath = resolve(normalizedPath);

    // Check if absolute paths are allowed
    if (!allowAbsolute && isAbsolute(path)) {
      throw new Error('Absolute paths not allowed');
    }

    // Check depth
    const depth = absolutePath.split(sep).length;
    if (depth > maxDepth) {
      throw new Error(`Path depth exceeds maximum (${maxDepth})`);
    }

    // Check allowed directories
    if (allowedDirectories.length > 0) {
      const isAllowed = allowedDirectories.some(dir => {
        const resolvedDir = resolve(dir);
        return absolutePath.startsWith(resolvedDir);
      });

      if (!isAllowed) {
        throw new Error('Path is outside allowed directories');
      }
    }

    return absolutePath;
  }

  /**
   * Check if a path is safe (doesn't traverse outside current directory)
   * @param path - Path to check
   * @returns true if path is safe
   */
  static isSafe(path: string): boolean {
    try {
      const cwd = process.cwd();
      const absolutePath = this.validate(path, {
        allowTraversal: false,
        allowedDirectories: [cwd]
      });
      return absolutePath.startsWith(cwd);
    } catch {
      return false;
    }
  }

  /**
   * Sanitize a path by removing dangerous components
   * @param path - Path to sanitize
   * @returns Sanitized path
   */
  static sanitize(path: string): string {
    // Remove null bytes and invalid characters
    let sanitized = path.replace(/\0/g, '');

    // Remove dangerous patterns
    sanitized = sanitized.replace(/\.\./g, '');
    sanitized = sanitized.replace(/~\//g, '');

    // Normalize path separators
    sanitized = normalize(sanitized);

    return sanitized;
  }

  /**
   * Check if path contains traversal patterns
   * @param path - Path to check
   * @returns true if traversal detected
   */
  static containsTraversal(path: string): boolean {
    return path.includes('..') || path.includes('~');
  }

  /**
   * Get relative path from base directory
   * Throws if path is outside base directory
   * @param path - Path to check
   * @param baseDir - Base directory
   * @returns Relative path from base
   */
  static getRelative(path: string, baseDir: string): string {
    const absolutePath = resolve(path);
    const absoluteBase = resolve(baseDir);

    if (!absolutePath.startsWith(absoluteBase)) {
      throw new Error('Path is outside base directory');
    }

    return absolutePath.slice(absoluteBase.length + 1);
  }
}

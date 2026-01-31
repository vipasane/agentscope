/**
 * Shared value objects across all bounded contexts
 */

/**
 * Package name value object
 * Ensures package names follow @claude-flow/* convention
 */
export class PackageName {
  private readonly value: string;

  constructor(value: string) {
    if (!value.startsWith('@claude-flow/') && !value.startsWith('@')) {
      throw new Error(`Invalid package name: ${value}. Must start with @scope/`);
    }
    this.value = value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: PackageName): boolean {
    return this.value === other.value;
  }
}

/**
 * Semantic version value object
 */
export class Version {
  constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
    public readonly prerelease?: string
  ) {
    if (major < 0 || minor < 0 || patch < 0) {
      throw new Error('Version numbers must be non-negative');
    }
  }

  toString(): string {
    const base = `${this.major}.${this.minor}.${this.patch}`;
    return this.prerelease ? `${base}-${this.prerelease}` : base;
  }

  static parse(versionString: string): Version {
    const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
      throw new Error(`Invalid version string: ${versionString}`);
    }
    return new Version(
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      match[4]
    );
  }

  equals(other: Version): boolean {
    return this.toString() === other.toString();
  }

  isGreaterThan(other: Version): boolean {
    if (this.major !== other.major) return this.major > other.major;
    if (this.minor !== other.minor) return this.minor > other.minor;
    if (this.patch !== other.patch) return this.patch > other.patch;
    return false;
  }
}

/**
 * File path value object
 */
export class FilePath {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('File path cannot be empty');
    }
    this.value = value;
  }

  toString(): string {
    return this.value;
  }

  isTypeScript(): boolean {
    return this.value.endsWith('.ts') || this.value.endsWith('.tsx');
  }

  getBaseName(): string {
    return this.value.split('/').pop() || '';
  }

  getExtension(): string {
    const parts = this.value.split('.');
    return parts.length > 1 ? parts.pop() || '' : '';
  }

  equals(other: FilePath): boolean {
    return this.value === other.value;
  }
}

/**
 * Base ID class for all entity identifiers
 */
export abstract class EntityId {
  protected readonly value: string;

  constructor(value?: string) {
    this.value = value || this.generateId();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  toString(): string {
    return this.value;
  }

  equals(other: EntityId): boolean {
    return this.value === other.value;
  }
}

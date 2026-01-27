/**
 * Unit tests for PermissionChecker
 *
 * Tests the 4-level permission model:
 * - Filesystem permissions (read, write, execute)
 * - Network permissions (hosts, ports)
 * - Process permissions (spawn, env)
 * - CLI permissions (register, modify)
 *
 * Target: 90%+ code coverage
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PermissionChecker } from '../../src/plugins/PermissionChecker';
import {
  PluginPermissions,
  PluginPermissionError,
} from '../../src/plugins/types';
import * as path from 'path';

describe('PermissionChecker', () => {
  let permissions: PluginPermissions;

  beforeEach(() => {
    // Reset permissions before each test
    permissions = {
      filesystem: {
        read: ['/tmp/test'],
        write: ['/tmp/test/output'],
        execute: [],
      },
      network: {
        hosts: ['api.example.com', '*.github.com'],
        ports: [443, 8080],
      },
      process: {
        spawn: true,
        commands: ['git', 'npm'],
      },
      cli: {
        registerCommands: true,
        modifyRegistry: false,
      },
    };
  });

  describe('checkFileAccess', () => {
    it('should allow access to allowed read paths', () => {
      expect(() => {
        PermissionChecker.checkFileAccess('/tmp/test/file.txt', permissions, 'read');
      }).not.toThrow();
    });

    it('should allow access to files within allowed directories', () => {
      expect(() => {
        PermissionChecker.checkFileAccess('/tmp/test/subdir/file.txt', permissions, 'read');
      }).not.toThrow();
    });

    it('should deny access to paths outside allowed directories', () => {
      expect(() => {
        PermissionChecker.checkFileAccess('/etc/passwd', permissions, 'read');
      }).toThrow(PluginPermissionError);
    });

    it('should deny write access to read-only paths', () => {
      expect(() => {
        PermissionChecker.checkFileAccess('/tmp/test/file.txt', permissions, 'write');
      }).toThrow(PluginPermissionError);
    });

    it('should allow write access to write-allowed paths', () => {
      expect(() => {
        PermissionChecker.checkFileAccess('/tmp/test/output/file.txt', permissions, 'write');
      }).not.toThrow();
    });

    it('should detect path traversal attempts', () => {
      expect(() => {
        PermissionChecker.checkFileAccess('/tmp/test/../../../etc/passwd', permissions, 'read');
      }).toThrow(PluginPermissionError);
    });

    it('should throw error when no filesystem permission declared', () => {
      const noFsPerms = { ...permissions, filesystem: undefined };
      expect(() => {
        PermissionChecker.checkFileAccess('/tmp/test/file.txt', noFsPerms, 'read');
      }).toThrow(PluginPermissionError);
    });

    it('should throw error when operation has empty allowed paths', () => {
      permissions.filesystem!.execute = [];
      expect(() => {
        PermissionChecker.checkFileAccess('/tmp/test/script.sh', permissions, 'execute');
      }).toThrow(PluginPermissionError);
    });

    it('should normalize paths before comparison', () => {
      expect(() => {
        PermissionChecker.checkFileAccess('/tmp/test/./file.txt', permissions, 'read');
      }).not.toThrow();
    });
  });

  describe('checkNetworkAccess', () => {
    it('should allow access to allowed hosts', () => {
      expect(() => {
        PermissionChecker.checkNetworkAccess('https://api.example.com/data', permissions);
      }).not.toThrow();
    });

    it('should allow access to wildcard subdomains', () => {
      expect(() => {
        PermissionChecker.checkNetworkAccess('https://api.github.com/repos', permissions);
      }).not.toThrow();
    });

    it('should allow access to wildcard base domain', () => {
      expect(() => {
        PermissionChecker.checkNetworkAccess('https://github.com', permissions);
      }).not.toThrow();
    });

    it('should deny access to non-allowed hosts', () => {
      expect(() => {
        PermissionChecker.checkNetworkAccess('https://malicious.com', permissions);
      }).toThrow(PluginPermissionError);
    });

    it('should check port restrictions', () => {
      expect(() => {
        PermissionChecker.checkNetworkAccess('http://api.example.com:8080/data', permissions);
      }).not.toThrow();
    });

    it('should deny access to non-allowed ports', () => {
      expect(() => {
        PermissionChecker.checkNetworkAccess('http://api.example.com:9000/data', permissions);
      }).toThrow(PluginPermissionError);
    });

    it('should use default ports for http and https', () => {
      expect(() => {
        PermissionChecker.checkNetworkAccess('https://api.example.com', permissions);
      }).not.toThrow();
    });

    it('should throw error when no network permission declared', () => {
      const noNetPerms = { ...permissions, network: undefined };
      expect(() => {
        PermissionChecker.checkNetworkAccess('https://api.example.com', noNetPerms);
      }).toThrow(PluginPermissionError);
    });

    it('should throw error for invalid URLs', () => {
      expect(() => {
        PermissionChecker.checkNetworkAccess('not-a-valid-url', permissions);
      }).toThrow(PluginPermissionError);
    });
  });

  describe('checkProcessAccess', () => {
    it('should allow spawn when permission granted', () => {
      expect(() => {
        PermissionChecker.checkProcessAccess('spawn', permissions);
      }).not.toThrow();
    });

    it('should allow spawn of allowed commands', () => {
      expect(() => {
        PermissionChecker.checkProcessAccess('spawn', permissions, 'git');
      }).not.toThrow();
    });

    it('should allow spawn with full command path', () => {
      expect(() => {
        PermissionChecker.checkProcessAccess('spawn', permissions, '/usr/bin/git');
      }).not.toThrow();
    });

    it('should deny spawn of non-allowed commands', () => {
      expect(() => {
        PermissionChecker.checkProcessAccess('spawn', permissions, 'rm');
      }).toThrow(PluginPermissionError);
    });

    it('should deny spawn when permission not granted', () => {
      permissions.process!.spawn = false;
      expect(() => {
        PermissionChecker.checkProcessAccess('spawn', permissions);
      }).toThrow(PluginPermissionError);
    });

    it('should allow env access when in permission list', () => {
      expect(() => {
        PermissionChecker.checkProcessAccess('env', permissions);
      }).not.toThrow();
    });

    it('should throw error when no process permission declared', () => {
      const noProcPerms = { ...permissions, process: undefined };
      expect(() => {
        PermissionChecker.checkProcessAccess('spawn', noProcPerms);
      }).toThrow(PluginPermissionError);
    });
  });

  describe('checkCLIAccess', () => {
    const coreCommands = ['help', 'version', 'init'];

    it('should allow command registration when permission granted', () => {
      expect(() => {
        PermissionChecker.checkCLIAccess('register', permissions, 'my-command', coreCommands);
      }).not.toThrow();
    });

    it('should deny registration of core commands', () => {
      expect(() => {
        PermissionChecker.checkCLIAccess('register', permissions, 'help', coreCommands);
      }).toThrow(PluginPermissionError);
    });

    it('should deny registration when permission not granted', () => {
      permissions.cli!.registerCommands = false;
      expect(() => {
        PermissionChecker.checkCLIAccess('register', permissions, 'my-command', coreCommands);
      }).toThrow(PluginPermissionError);
    });

    it('should deny registry modification when permission not granted', () => {
      expect(() => {
        PermissionChecker.checkCLIAccess('modify', permissions);
      }).toThrow(PluginPermissionError);
    });

    it('should allow registry modification when permission granted', () => {
      permissions.cli!.modifyRegistry = true;
      expect(() => {
        PermissionChecker.checkCLIAccess('modify', permissions);
      }).not.toThrow();
    });

    it('should throw error when no CLI permission declared', () => {
      const noCliPerms = { ...permissions, cli: undefined };
      expect(() => {
        PermissionChecker.checkCLIAccess('register', noCliPerms, 'my-command', coreCommands);
      }).toThrow(PluginPermissionError);
    });
  });

  describe('validatePermissions', () => {
    it('should validate correct permission structure', () => {
      expect(() => {
        PermissionChecker.validatePermissions(permissions);
      }).not.toThrow();
    });

    it('should throw error for non-object permissions', () => {
      expect(() => {
        PermissionChecker.validatePermissions(null as any);
      }).toThrow('Permissions must be an object');
    });

    it('should throw error for non-array filesystem.read', () => {
      permissions.filesystem!.read = 'not-an-array' as any;
      expect(() => {
        PermissionChecker.validatePermissions(permissions);
      }).toThrow('filesystem.read must be an array');
    });

    it('should throw error for non-array filesystem.write', () => {
      permissions.filesystem!.write = {} as any;
      expect(() => {
        PermissionChecker.validatePermissions(permissions);
      }).toThrow('filesystem.write must be an array');
    });

    it('should throw error for non-array network.hosts', () => {
      permissions.network!.hosts = 'not-an-array' as any;
      expect(() => {
        PermissionChecker.validatePermissions(permissions);
      }).toThrow('network.hosts must be an array');
    });

    it('should throw error for invalid port numbers', () => {
      permissions.network!.ports = [70000];
      expect(() => {
        PermissionChecker.validatePermissions(permissions);
      }).toThrow('network.ports must contain valid port numbers');
    });

    it('should throw error for non-boolean process.spawn', () => {
      permissions.process!.spawn = 'yes' as any;
      expect(() => {
        PermissionChecker.validatePermissions(permissions);
      }).toThrow('process.spawn must be a boolean');
    });

    it('should throw error for non-boolean cli.registerCommands', () => {
      permissions.cli!.registerCommands = 1 as any;
      expect(() => {
        PermissionChecker.validatePermissions(permissions);
      }).toThrow('cli.registerCommands must be a boolean');
    });

    it('should accept empty permissions object', () => {
      expect(() => {
        PermissionChecker.validatePermissions({});
      }).not.toThrow();
    });
  });
});

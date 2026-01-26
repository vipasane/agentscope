/**
 * Integration testing example
 */

import {
  IntegrationTestRunner,
  E2ETestBuilder,
  ContractTestBuilder
} from '../src/index';

async function integrationTestingExample() {
  console.log('=== Integration Testing Example ===\n');

  // 1. Basic integration tests
  console.log('1. Running integration tests...');
  const runner = new IntegrationTestRunner({
    timeout: 5000,
    parallel: false,
    retries: 2
  });

  runner
    .add('setup database', async () => {
      console.log('  - Setting up database');
    })
    .add('create user', async () => {
      console.log('  - Creating user');
    })
    .add('create task', async () => {
      console.log('  - Creating task');
    });

  const report1 = await runner.run(
    async () => {
      console.log('  → Setup phase');
    },
    async () => {
      console.log('  → Cleanup phase');
    }
  );

  console.log(`\nResults: ${report1.passed}/${report1.totalTests} passed`);

  // 2. E2E testing with rollback
  console.log('\n2. Running E2E tests with rollback...');
  const e2e = new E2ETestBuilder();

  let resourceId = '';

  e2e
    .addStep(
      'create resource',
      async () => {
        resourceId = 'resource-123';
        console.log('  - Resource created:', resourceId);
      },
      async () => {
        console.log('  - Rolled back resource');
      }
    )
    .addStep(
      'modify resource',
      async () => {
        console.log('  - Resource modified');
      },
      async () => {
        console.log('  - Resource changes reverted');
      }
    );

  const e2eReport = await e2e.execute();
  console.log(`\nE2E Results: ${e2eReport.passed} passed`);

  // 3. Contract testing
  console.log('\n3. Contract testing...');
  const contracts = new ContractTestBuilder();

  contracts
    .addContract(
      'User Service',
      async () => ({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com'
      }),
      async (user) => {
        if (!user || typeof user !== 'object') {
          throw new Error('Invalid user object');
        }
        const u = user as Record<string, unknown>;
        if (!u.id || !u.name || !u.email) {
          throw new Error('Missing required fields');
        }
      }
    )
    .addContract(
      'Task Service',
      async () => ({
        id: '456',
        title: 'Test Task',
        status: 'pending'
      }),
      async (task) => {
        const t = task as Record<string, unknown>;
        if (!t.id || !t.title) {
          throw new Error('Missing required fields');
        }
      }
    );

  const contractReport = await contracts.verify();
  console.log(`\nContract Results: ${contractReport.passed} passed`);
}

integrationTestingExample().catch(console.error);

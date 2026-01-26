/**
 * Basic testing example with @claude-flow/testing
 */

import {
  createTestContext,
  completeTestContext,
  createMockAgent,
  createMockMemory,
  expectAgent,
  expectTestContext
} from '../src/index';

async function basicTestingExample() {
  console.log('=== Basic Testing Example ===\n');

  // 1. Create and manage test context
  const context = createTestContext('User Registration Test', {
    environment: 'test',
    userId: '123'
  });

  console.log('Test context created:', context.name);

  // 2. Create mock components
  const mockAgent = createMockAgent({ type: 'coder' });
  const mockMemory = createMockMemory();

  // 3. Simulate test operations
  mockAgent.call('validateEmail', 'user@example.com');
  mockAgent.call('createUser', { name: 'Test User' });

  mockMemory.store('user:123', { id: '123', name: 'Test User' });

  // 4. Assert results
  console.log('\nAgent calls:', mockAgent.getCallCount());
  console.log('Memory entries:', mockMemory.retrieve('user:123'));

  // 5. Complete test
  const completed = completeTestContext(context, 'passed');
  console.log('\nTest status:', completed.status);
  console.log('Test duration:', completed.duration, 'ms');

  // 6. Custom assertions
  expectTestContext(completed).toHavePassed();
  expectAgent(mockAgent).toHaveCalled('validateEmail');

  console.log('\nAll assertions passed!');
}

basicTestingExample().catch(console.error);

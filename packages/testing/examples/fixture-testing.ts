/**
 * Fixture testing example
 */

import {
  FixtureLoader,
  FixtureBuilder,
  CommonFixtures,
  FixtureRepository
} from '../src/index';

async function fixtureTestingExample() {
  console.log('=== Fixture Testing Example ===\n');

  // 1. Using FixtureLoader
  const loader = new FixtureLoader({ cache: true });
  const userFixture = await loader.load('user', 'json');
  console.log('Loaded fixture:', userFixture.name);
  console.log('Fixture data:', userFixture.data);

  // 2. Using FixtureBuilder
  const customFixture = new FixtureBuilder()
    .set('id', '123')
    .set('email', 'custom@example.com')
    .setArray('roles', 2, (i) => ({ id: i, name: `role${i}` }))
    .build();

  console.log('\nCustom fixture:', customFixture.data);

  // 3. Using CommonFixtures
  const agents = [
    CommonFixtures.agent({ type: 'coder' }),
    CommonFixtures.agent({ type: 'reviewer' }),
    CommonFixtures.agent({ type: 'tester' })
  ];

  console.log('\nGenerated agents:', agents.map(a => (a.data as Record<string, unknown>).type));

  // 4. Using FixtureRepository
  const repo = new FixtureRepository();
  agents.forEach((agent, i) => {
    repo.register(`agent-${i}`, agent);
  });

  console.log('Repository size:', repo.count());
  const allAgents = repo.getAll();
  console.log('All agents:', allAgents.length);

  // 5. Querying fixtures
  const coders = repo.query((f) => {
    const data = f.data as Record<string, unknown>;
    return data.type === 'coder';
  });

  console.log('Found coders:', coders.length);
}

fixtureTestingExample().catch(console.error);

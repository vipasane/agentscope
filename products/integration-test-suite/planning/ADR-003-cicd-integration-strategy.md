# ADR-003: CI/CD Integration Strategy

## Status
Proposed

## Context

Integration tests must run automatically on every code change to catch breaking changes early. The test suite must integrate seamlessly with GitHub Actions CI/CD pipeline while maintaining fast execution times.

### Requirements
- Automated execution on PR and push events
- Parallel test execution for speed
- Comprehensive coverage reporting
- Integration with code quality tools
- <5 minute total execution time
- Self-healing test detection
- Automatic retry for flaky tests

## Decision

### 1. GitHub Actions Workflow

```yaml
name: Integration Tests

on:
  pull_request:
    paths:
      - 'packages/**'
      - 'products/integration-test-suite/**'
      - 'vitest.workspace.ts'
  push:
    branches: [main, develop]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    strategy:
      matrix:
        node-version: [20.x, 22.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build packages
        run: npm run build --workspaces
      
      - name: Run integration tests
        run: npm run test:integration -- --reporter=verbose --reporter=json --outputFile=test-results.json
        env:
          NODE_ENV: test
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: integration
          name: integration-tests
      
      - name: Store test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ matrix.node-version }}
          path: test-results.json
      
      - name: Learning hook - Store results
        if: always()
        run: |
          npx @claude-flow/cli@latest hooks post-task \
            --task-id "integration-tests-${{ github.sha }}" \
            --success ${{ job.status == 'success' }} \
            --store-results true

  breaking-change-detection:
    runs-on: ubuntu-latest
    needs: integration-tests
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Detect breaking changes
        run: npm run test:breaking-changes
      
      - name: Comment on PR
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ Breaking changes detected in integration tests. Please review.'
            })

  performance-benchmarks:
    runs-on: ubuntu-latest
    needs: integration-tests
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run performance benchmarks
        run: npm run bench:integration
      
      - name: Store benchmark results
        run: |
          npx @claude-flow/cli@latest memory store \
            --namespace "benchmarks" \
            --key "integration-${{ github.sha }}" \
            --value "$(cat benchmark-results.json)"

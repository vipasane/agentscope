#!/bin/bash
# Validation script for Learning Integration implementation
# Verifies all files are present and requirements are met

set -e

echo "=== Learning Integration Implementation Validation ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $1 (missing)"
    ((FAIL++))
  fi
}

check_lines() {
  local file=$1
  local min_lines=$2
  local actual_lines=$(wc -l < "$file" 2>/dev/null || echo "0")

  if [ "$actual_lines" -ge "$min_lines" ]; then
    echo -e "${GREEN}✓${NC} $file ($actual_lines lines >= $min_lines)"
    ((PASS++))
  else
    echo -e "${YELLOW}!${NC} $file ($actual_lines lines < $min_lines)"
  fi
}

echo "1. Core Implementation Files"
echo "----------------------------"
check_file "src/learning/types.ts"
check_file "src/learning/EmbeddingGenerator.ts"
check_file "src/learning/CommandPatternService.ts"
check_file "src/learning/LearningConfig.ts"
check_file "src/learning/index.ts"
echo ""

echo "2. Test Files"
echo "-------------"
check_file "tests/learning/EmbeddingGenerator.test.ts"
check_file "tests/learning/CommandPatternService.test.ts"
check_file "tests/learning/LearningConfig.test.ts"
check_file "tests/integration/learning-integration.test.ts"
echo ""

echo "3. Benchmark Files"
echo "------------------"
check_file "benchmarks/learning/pattern-learning.bench.ts"
echo ""

echo "4. Documentation"
echo "----------------"
check_file "docs/learning/README.md"
check_file "docs/learning/QUICK-START.md"
check_file "LEARNING-IMPLEMENTATION-SUMMARY.md"
check_file "COMPONENT-3-CHECKLIST.md"
echo ""

echo "5. Line Count Validation"
echo "------------------------"
check_lines "src/learning/CommandPatternService.ts" 200
check_lines "src/learning/EmbeddingGenerator.ts" 100
check_lines "tests/learning/CommandPatternService.test.ts" 200
check_lines "tests/learning/EmbeddingGenerator.test.ts" 100
echo ""

echo "6. TypeScript Compilation Check"
echo "--------------------------------"
if [ -f "tsconfig.json" ]; then
  if command -v tsc &> /dev/null; then
    echo -e "${YELLOW}Running TypeScript compilation...${NC}"
    if tsc --noEmit 2>&1 | grep -q "error"; then
      echo -e "${RED}✗${NC} TypeScript compilation errors found"
      ((FAIL++))
    else
      echo -e "${GREEN}✓${NC} TypeScript compilation successful"
      ((PASS++))
    fi
  else
    echo -e "${YELLOW}!${NC} tsc not found, skipping compilation check"
  fi
else
  echo -e "${YELLOW}!${NC} tsconfig.json not found"
fi
echo ""

echo "7. Review Decision Compliance"
echo "-----------------------------"

# Check for review decision keywords in code
if grep -q "enabled: false" src/learning/types.ts; then
  echo -e "${GREEN}✓${NC} Q28: Learning disabled by default"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Q28: Learning should be disabled by default"
  ((FAIL++))
fi

if grep -q "M: 16" src/learning/types.ts; then
  echo -e "${GREEN}✓${NC} Q32: HNSW M=16"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Q32: HNSW M should be 16"
  ((FAIL++))
fi

if grep -q "efConstruction: 200" src/learning/types.ts; then
  echo -e "${GREEN}✓${NC} Q32: HNSW efConstruction=200"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Q32: HNSW efConstruction should be 200"
  ((FAIL++))
fi

if grep -q "threshold: 0.75" src/learning/types.ts; then
  echo -e "${GREEN}✓${NC} Q33: Suggestion threshold 0.75"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Q33: Suggestion threshold should be 0.75"
  ((FAIL++))
fi

if grep -q "threshold: 0.8" src/learning/types.ts; then
  echo -e "${GREEN}✓${NC} Q34: Error recovery threshold 0.8"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Q34: Error recovery threshold should be 0.8"
  ((FAIL++))
fi

echo ""
echo "=== Summary ==="
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✓ All validation checks passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some validation checks failed${NC}"
  exit 1
fi

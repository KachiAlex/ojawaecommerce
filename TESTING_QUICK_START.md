# 🚀 Testing Quick Start Guide

Get your testing infrastructure up and running in 5 minutes!

---

## Step 1: Install Dependencies

```bash
cd apps/buyer
npm install --save-dev @vitest/ui @vitest/coverage-v8 @playwright/test
```

---

## Step 2: Verify Configuration

The following files are already created:
- ✅ `vitest.config.js` - Vitest configuration
- ✅ `src/test/setup.js` - Test setup file
- ✅ `src/test/helpers.jsx` - Test helper utilities

---

## Step 3: Run Your First Test

```bash
# Run all tests
npm run test

# Run tests in watch mode (recommended for development)
npm run test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage
```

---

## Step 4: View Test Results

### In Terminal
Tests will run and show results in your terminal.

### In Browser (UI Mode)
```bash
npm run test:ui
```
This opens an interactive test runner in your browser at `http://localhost:51204/__vitest__/`

---

## Step 5: Example Tests

I've created example tests for you:

1. **`src/pages/Products.test.jsx`** - Tests the Products page
2. **`src/components/ProductCard.test.jsx`** - Tests the ProductCard component

Run them:
```bash
npm run test Products.test
npm run test ProductCard.test
```

---

## Step 6: Write Your Own Test

Create a new test file: `src/components/YourComponent.test.jsx`

```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderWithProviders } from '../test/helpers'
import YourComponent from './YourComponent'

describe('YourComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<YourComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

---

## Common Commands

```bash
# Run all tests
npm run test

# Run specific test file
npm run test Products.test

# Run tests matching pattern
npm run test -- --grep "Product"

# Run with coverage
npm run test:coverage

# View coverage report
open coverage/index.html

# Run in UI mode
npm run test:ui
```

---

## What's Next?

1. **Read the full guide**: See `TESTING_GUIDE.md` for comprehensive documentation
2. **Add more tests**: Start with critical components and user flows
3. **Set up E2E tests**: See E2E section in `TESTING_GUIDE.md`
4. **CI/CD Integration**: Add tests to your GitHub Actions workflow

---

## Troubleshooting

### Tests not running?
- Make sure you're in `apps/buyer` directory
- Check that `vitest.config.js` exists
- Verify dependencies are installed: `npm list vitest`

### Mock errors?
- Check that Firebase mocks are set up correctly
- See mocking examples in `TESTING_GUIDE.md`

### Coverage not generating?
- Run: `npm run test:coverage`
- Check `vitest.config.js` has coverage provider set to 'v8'

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:ui` | Open interactive UI |

---

**Ready to test!** 🎉

For detailed information, see `TESTING_GUIDE.md`


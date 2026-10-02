import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// extends Vitest's expect with jest-dom matchers (avoid redefining in other runners)
const jestMatchersKey = Symbol.for('$$jest-matchers-object')
if (!Object.prototype.hasOwnProperty.call(expect, jestMatchersKey)) {
  expect.extend(matchers)
}

// Mock apiService notifications globally
vi.mock('../services/apiService', async () => {
  const actual = await vi.importActual('../services/apiService')
  return {
    ...actual,
    default: {
      ...actual.default,
      notifications: {
        getByUser: vi.fn(() => Promise.resolve([])),
        listenToUserNotifications: vi.fn(() => vi.fn()),
        markAsRead: vi.fn(() => Promise.resolve()),
        markAllAsRead: vi.fn(() => Promise.resolve()),
      },
    },
  }
})

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

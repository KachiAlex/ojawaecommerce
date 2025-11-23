import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// extends Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Mock Firebase before any imports
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore')
  return {
    ...actual,
    enableMultiTabIndexedDbPersistence: vi.fn(() => Promise.resolve()),
    enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
  }
})

vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  isSupported: vi.fn(() => Promise.resolve(false)),
}))

// Mock firebaseService notifications globally
vi.mock('../services/firebaseService', async () => {
  const actual = await vi.importActual('../services/firebaseService')
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

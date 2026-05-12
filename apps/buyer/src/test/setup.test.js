import { describe, it, expect } from 'vitest'

describe('Test Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have testing library matchers available', () => {
    const element = document.createElement('div')
    element.textContent = 'Hello World'
    document.body.appendChild(element)
    expect(element).toBeInTheDocument()
  })
})

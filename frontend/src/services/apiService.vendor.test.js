import { describe, it, expect, vi, beforeEach } from 'vitest'
import { orderService, walletService } from './apiService'

describe('Vendor dashboard service integrations', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.localStorage = { getItem: vi.fn(() => 'test-token') }
  })

  const mockFetch = (response) => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(response)
      })
    )
  }

  it('maps frontend workflow statuses to backend enum values', () => {
    expect(orderService.mapFrontendStatus('ready_for_shipment')).toBe('shipped')
    expect(orderService.mapFrontendStatus('completed')).toBe('delivered')
    expect(orderService.mapFrontendStatus('in_transit')).toBe('shipped')
    expect(orderService.mapFrontendStatus('out_for_delivery')).toBe('shipped')
    expect(orderService.mapFrontendStatus('processing')).toBe('processing')
    expect(orderService.mapFrontendStatus('cancelled')).toBe('cancelled')
  })

  it('updateStatus sends PUT to /api/orders/:id/status with mapped status', async () => {
    mockFetch({ success: true })
    await orderService.updateStatus('order-123', 'ready_for_shipment', { readyForShipmentAt: new Date().toISOString() })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toContain('/api/orders/order-123/status')
    expect(options.method).toBe('PUT')
    const body = JSON.parse(options.body)
    expect(body.status).toBe('shipped')
  })

  it('updateStatus pulls trackingNumber from carrier when provided', async () => {
    mockFetch({ success: true })
    await orderService.updateStatus('order-123', 'shipped', { carrier: 'DHL', trackingNumber: 'TRACK-1', eta: '2026-08-01' })

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.status).toBe('shipped')
    expect(body.trackingNumber).toBe('TRACK-1')
  })

  it('markShipped sends status shipped with tracking data', async () => {
    mockFetch({ success: true })
    await orderService.markShipped('order-456', { carrier: 'FedEx', trackingNumber: 'FN-999', eta: '2026-08-10' })

    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toContain('/api/orders/order-456/status')
    const body = JSON.parse(options.body)
    expect(body.status).toBe('shipped')
    expect(body.trackingNumber).toBe('FN-999')
  })

  it('releaseWallet sends POST to /api/payments/escrow/release with order details', async () => {
    mockFetch({ success: true, message: 'Escrow funds released successfully' })
    await walletService.releaseWallet('order-789', 'vendor-uid-1', 12500)

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toContain('/api/payments/escrow/release')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body)
    expect(body.orderId).toBe('order-789')
    expect(body.vendorId).toBe('vendor-uid-1')
    expect(body.amount).toBe(12500)
  })
})

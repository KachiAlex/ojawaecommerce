import { useState, useEffect } from 'react'
import firebaseService from '../services/firebaseService'
import { errorLogger } from '../utils/errorLogger'

const LogisticsAssignmentModal = ({ order, onClose, onAssignmentComplete }) => {
  const [logisticsPartners, setLogisticsPartners] = useState([])
  const [selectedPartner, setSelectedPartner] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPartners, setLoadingPartners] = useState(true)

  useEffect(() => {
    fetchLogisticsPartners()
  }, [])

  const fetchLogisticsPartners = async () => {
    try {
      setLoadingPartners(true)
      const partners = await firebaseService.logistics.getAllPartners()
      setLogisticsPartners(partners)
    } catch (error) {
      errorLogger.error('Failed to fetch logistics partners', error)
    } finally {
      setLoadingPartners(false)
    }
  }

  const handleAssignment = async (e) => {
    e.preventDefault()
    if (!selectedPartner || !trackingNumber) {
      alert('Please select a logistics partner and enter a tracking number')
      return
    }

    try {
      setLoading(true)
      
      // Create delivery record
      const deliveryData = {
        orderId: order.id,
        buyerId: order.buyerId,
        vendorId: order.vendorId,
        logisticsPartnerId: selectedPartner,
        trackingNumber: trackingNumber.trim(),
        pickupDate: pickupDate || new Date(),
        status: 'pending_pickup',
        notes: notes.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await firebaseService.deliveries.create(deliveryData)

      // Update order status to shipped
      await firebaseService.orders.updateStatus(order.id, 'shipped', {
        logisticsPartnerId: selectedPartner,
        trackingNumber: trackingNumber.trim(),
        shippedAt: new Date()
      })

      // Send notifications
      await firebaseService.notifications.send({
        type: 'order_shipped',
        userId: order.buyerId,
        title: 'Your order has been shipped!',
        message: `Order #${order.id.slice(-8)} is on its way. Tracking: ${trackingNumber}`,
        data: { orderId: order.id, trackingNumber }
      })

      await firebaseService.notifications.send({
        type: 'pickup_assigned',
        userId: selectedPartner,
        title: 'New pickup assigned',
        message: `Pickup assigned for Order #${order.id.slice(-8)}`,
        data: { orderId: order.id, deliveryId: deliveryData.id }
      })

      errorLogger.info('Logistics assignment completed', {
        orderId: order.id,
        partnerId: selectedPartner,
        trackingNumber
      })

      onAssignmentComplete?.()
      onClose()
    } catch (error) {
      errorLogger.error('Failed to assign logistics partner', error)
      alert('Failed to assign logistics partner. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingPartners) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading logistics partners...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Assign Logistics Partner
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Order Details</h4>
            <p className="text-sm text-blue-800">
              Order #{order.id.slice(-8)} • ${order.totalAmount?.toFixed(2)} • {order.items?.length || 0} items
            </p>
          </div>

          <form onSubmit={handleAssignment} className="space-y-4">
            <div>
              <label htmlFor="partner" className="block text-sm font-medium text-gray-700 mb-1">
                Logistics Partner *
              </label>
              <select
                id="partner"
                value={selectedPartner}
                onChange={(e) => setSelectedPartner(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value="">Select a logistics partner</option>
                {logisticsPartners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} - {partner.serviceArea} ({partner.rating}/5 ⭐)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tracking" className="block text-sm font-medium text-gray-700 mb-1">
                Tracking Number *
              </label>
              <input
                type="text"
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter tracking number"
                required
              />
            </div>

            <div>
              <label htmlFor="pickup-date" className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Date
              </label>
              <input
                type="date"
                id="pickup-date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Special Instructions
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Any special instructions for pickup..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Assigning...' : 'Assign Logistics Partner'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LogisticsAssignmentModal

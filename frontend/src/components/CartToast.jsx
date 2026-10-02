import { useEffect, useState } from 'react'

const CartToast = () => {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      const { name, quantity } = e.detail || {}
      setToast({
        id: Date.now(),
        message: `${quantity || 1} ${quantity === 1 ? 'item' : 'items'}${name ? ` of ${name}` : ''} added to cart`,
      })
      // Auto hide after 2.5s
      setTimeout(() => setToast(null), 2500)
    }
    window.addEventListener('cart:add', handler)
    return () => window.removeEventListener('cart:add', handler)
  }, [])

  if (!toast) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
      <div className="bg-emerald-600 text-white shadow-lg rounded-lg px-4 py-3 text-sm animate-in slide-in-from-top-5 fade-in duration-300">
        ✅ {toast.message}
      </div>
    </div>
  )
}

export default CartToast



import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import firebaseService from '../services/firebaseService'

const Wallet = () => {
  const { currentUser, userProfile } = useAuth()
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [topupAmount, setTopupAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawAccount, setWithdrawAccount] = useState({ type: 'bank', accountNumber: '', accountName: '', bankName: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    if (!currentUser) return
    try {
      setLoading(true)
      const [w, tx] = await Promise.all([
        firebaseService.wallet.getUserWallet(currentUser.uid),
        firebaseService.wallet.getUserTransactions(currentUser.uid)
      ])
      setWallet(w)
      setTransactions(tx)
    } catch (e) {
      console.error(e)
      setError('Failed to load wallet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Pre-fill topup from query param (?topup=amount)
    try {
      const url = new URL(window.location.href)
      const t = url.searchParams.get('topup')
      if (t) setTopupAmount(t)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid])

  const handleTopup = async () => {
    if (!wallet || !topupAmount) return
    try {
      setSubmitting(true)
      const amountNgn = Number(topupAmount)
      if (!amountNgn || amountNgn <= 0) throw new Error('Enter a valid amount')

      // For demo purposes, simulate a successful payment
      // In production, integrate with your preferred payment processor
      const mockTransactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Add funds to wallet using the existing service
      await firebaseService.wallet.addFunds(
        wallet.id,
        amountNgn,
        mockTransactionId,
        'Wallet top-up via payment'
      )
      
      // Refresh wallet data
      setTopupAmount('')
      await load()
      alert('Wallet topped up successfully!')
    } catch (e) {
      console.error(e)
      setError(e.message || 'Top-up failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleWithdraw = async () => {
    if (!wallet || !withdrawAmount) return
    try {
      setSubmitting(true)
      await firebaseService.wallet.transferToExternalAccount(
        wallet.id,
        Number(withdrawAmount),
        withdrawAccount,
        'Wallet withdrawal'
      )
      setWithdrawAmount('')
      await load()
    } catch (e) {
      console.error(e)
      setError('Withdrawal failed')
    } finally {
      setSubmitting(false)
    }
  }

  const useSavedPayout = () => {
    const payout = userProfile?.payout
    if (!payout) return
    setWithdrawAccount({
      type: payout.method || 'bank',
      accountNumber: payout.accountNumber || '',
      accountName: payout.accountName || '',
      bankName: payout.bankName || '',
      provider: payout.provider || ''
    })
  }

  const formatDate = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null)
      return d ? d.toLocaleString() : '—'
    } catch { return '—' }
  }

  const typeTag = (type) => {
    const map = {
      credit: 'bg-emerald-100 text-emerald-700',
      debit: 'bg-rose-100 text-rose-700',
      withdrawal: 'bg-amber-100 text-amber-700',
      wallet_funding: 'bg-emerald-100 text-emerald-700',
      escrow_release: 'bg-blue-100 text-blue-700',
      dispute_hold: 'bg-yellow-100 text-yellow-700',
      dispute_resolution: 'bg-purple-100 text-purple-700'
    }
    return map[type] || 'bg-gray-100 text-gray-700'
  }

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-700">Please sign in to view your wallet.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-600">Loading wallet...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
        <p className="text-sm text-gray-600">Manage your balance, top-up, and withdraw funds.</p>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-800">{error}</div>
      )}

      {/* Balance and Actions */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="bg-white rounded-xl border p-6 md:col-span-1">
          <p className="text-sm text-gray-600">Current Balance</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">₦{(wallet?.balance || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Wallet ID: {wallet?.id || '—'}</p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Top Up</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
              placeholder="Amount (₦)"
            />
            <button onClick={handleTopup} disabled={submitting || !topupAmount}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {submitting ? 'Processing...' : 'Add Funds'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">For demo purposes, this simulates a successful top-up.</p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Withdraw</h3>
          <div className="grid gap-2 mb-2">
            <input type="number" min="1" value={withdrawAmount} onChange={(e)=>setWithdrawAmount(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2" placeholder="Amount (₦)" />
            <select value={withdrawAccount.type} onChange={(e)=>setWithdrawAccount({ ...withdrawAccount, type: e.target.value })} className="border border-gray-300 rounded-lg px-4 py-2">
              <option value="bank">Bank</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
            <input type="text" value={withdrawAccount.accountName} onChange={(e)=>setWithdrawAccount({ ...withdrawAccount, accountName: e.target.value })} className="border border-gray-300 rounded-lg px-4 py-2" placeholder="Account Name" />
            <input type="text" value={withdrawAccount.accountNumber} onChange={(e)=>setWithdrawAccount({ ...withdrawAccount, accountNumber: e.target.value })} className="border border-gray-300 rounded-lg px-4 py-2" placeholder="Account Number" />
            {withdrawAccount.type === 'bank' && (
              <input type="text" value={withdrawAccount.bankName} onChange={(e)=>setWithdrawAccount({ ...withdrawAccount, bankName: e.target.value })} className="border border-gray-300 rounded-lg px-4 py-2" placeholder="Bank Name" />
            )}
          </div>
          {userProfile?.payout && (
            <button onClick={useSavedPayout} className="mr-3 px-3 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50">Use saved payout details</button>
          )}
          <button onClick={handleWithdraw} disabled={submitting || !withdrawAmount}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50">
            {submitting ? 'Processing...' : 'Withdraw'}
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        <div className="divide-y">
          {transactions.length === 0 && (
            <div className="p-4 text-sm text-gray-600">No transactions found.</div>
          )}
          {transactions.map(tx => (
            <div key={tx.id} className="p-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${typeTag(tx.type)}`}>
                  {tx.type.replace('_', ' ')}
                </span>
                <div>
                  <p className="font-medium text-gray-900">₦{(tx.amount || 0).toLocaleString()}</p>
                  <p className="text-gray-500">{tx.description || '—'}</p>
                </div>
              </div>
              <div className="text-right text-gray-500">
                <p>{tx.status}</p>
                <p className="text-xs">{formatDate(tx.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Wallet



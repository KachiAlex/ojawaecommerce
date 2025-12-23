import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import firebaseService from '../services/firebaseService'
import { openWalletTopUpCheckout } from '../utils/flutterwave'
import SupportTicket from '../components/SupportTicket'

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
  const [showReportIssue, setShowReportIssue] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

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
    if (!topupAmount) {
      setError('Enter a valid amount')
      return
    }
    try {
      setSubmitting(true)
      // Ensure wallet is loaded before proceeding
      if (!wallet) {
        await load()
      }
      if (!wallet) {
        setError('Wallet is initializing. Please wait a moment and try again.')
        return
      }

      const amountNgn = Number(topupAmount)
      if (!amountNgn || amountNgn <= 0) throw new Error('Enter a valid amount')

      // Launch Flutterwave Checkout and let the Cloud Function credit the wallet
      await openWalletTopUpCheckout({ user: currentUser, amount: amountNgn, currency: wallet?.currency || 'NGN' })
      
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
      credit: 'bg-teal-900/40 text-teal-200 border border-teal-500/40',
      debit: 'bg-rose-900/40 text-rose-200 border border-rose-500/40',
      withdrawal: 'bg-amber-900/40 text-amber-200 border border-amber-500/40',
      wallet_funding: 'bg-emerald-900/40 text-emerald-200 border border-emerald-500/40',
      escrow_release: 'bg-teal-900/40 text-teal-200 border border-teal-500/40',
      dispute_hold: 'bg-amber-900/40 text-amber-200 border border-amber-500/40',
      dispute_resolution: 'bg-emerald-900/40 text-emerald-200 border border-emerald-500/40'
    }
    return map[type] || 'bg-slate-900/60 text-teal-200 border border-slate-700/60'
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <p className="text-teal-100">Please sign in to view your wallet.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <p className="text-teal-100">Loading wallet...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-teal-300 via-amber-300 to-emerald-300 bg-clip-text text-transparent">
            My Wallet
          </h1>
          <p className="text-sm text-teal-200 mt-1">
            Manage your balance, top-up, and withdraw funds securely with Ojawa escrow.
          </p>
      </div>

      {error && (
          <div className="p-3 mb-4 bg-rose-900/40 border border-rose-500/60 rounded text-sm text-rose-100">{error}</div>
      )}

      {/* Balance and Actions */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="bg-slate-950 rounded-xl border border-teal-900/70 p-6 md:col-span-1 shadow-soft">
            <p className="text-sm text-teal-200">Current Balance</p>
            <p className="text-3xl font-bold text-amber-300 mt-1">
              ₦{(wallet?.balance || 0).toLocaleString()}
            </p>
            <p className="text-xs text-teal-300/80 mt-1">Wallet ID: {wallet?.id || '—'}</p>
        </div>
          <div className="bg-slate-950 rounded-xl border border-teal-900/70 p-6 shadow-soft">
            <h3 className="font-semibold text-teal-100 mb-3">Top Up</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              className="flex-1 border border-teal-700 rounded-lg px-4 py-2 bg-slate-900 text-teal-50 placeholder:text-teal-400/70"
              placeholder="Amount (₦)"
            />
            <button onClick={handleTopup} disabled={submitting || !topupAmount || !wallet || loading}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 rounded-lg hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 shadow-lg">
              {submitting ? 'Processing...' : 'Add Funds'}
            </button>
          </div>
          <p className="text-xs text-teal-300/80 mt-2">For demo purposes, this simulates a successful top-up.</p>
        </div>
        <div className="bg-slate-950 rounded-xl border border-teal-900/70 p-6 shadow-soft">
          <h3 className="font-semibold text-teal-100 mb-3">Withdraw</h3>
          <div className="grid gap-2 mb-2">
            <input type="number" min="1" value={withdrawAmount} onChange={(e)=>setWithdrawAmount(e.target.value)} className="border border-teal-700 rounded-lg px-4 py-2 bg-slate-900 text-teal-50" placeholder="Amount (₦)" />
            <select value={withdrawAccount.type} onChange={(e)=>setWithdrawAccount({ ...withdrawAccount, type: e.target.value })} className="border border-teal-700 rounded-lg px-4 py-2 bg-slate-900 text-teal-50">
              <option value="bank">Bank</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
            <input type="text" value={withdrawAccount.accountName} onChange={(e)=>setWithdrawAccount({ ...withdrawAccount, accountName: e.target.value })} className="border border-teal-700 rounded-lg px-4 py-2 bg-slate-900 text-teal-50" placeholder="Account Name" />
            <input type="text" value={withdrawAccount.accountNumber} onChange={(e)=>setWithdrawAccount({ ...withdrawAccount, accountNumber: e.target.value })} className="border border-teal-700 rounded-lg px-4 py-2 bg-slate-900 text-teal-50" placeholder="Account Number" />
            {withdrawAccount.type === 'bank' && (
              <input type="text" value={withdrawAccount.bankName} onChange={(e)=>setWithdrawAccount({ ...withdrawAccount, bankName: e.target.value })} className="border border-teal-700 rounded-lg px-4 py-2 bg-slate-900 text-teal-50" placeholder="Bank Name" />
            )}
          </div>
          {userProfile?.payout && (
            <button onClick={useSavedPayout} className="mr-3 px-3 py-2 text-sm border border-teal-700 rounded-lg text-teal-200 hover:bg-slate-900/70">
              Use saved payout details
            </button>
          )}
          <button onClick={handleWithdraw} disabled={submitting || !withdrawAmount}
            className="px-4 py-2 bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 rounded-lg hover:from-emerald-300 hover:to-teal-400 disabled:opacity-50 shadow-lg">
            {submitting ? 'Processing...' : 'Withdraw'}
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-slate-950 rounded-xl border border-teal-900/70">
        <div className="p-4 border-b border-teal-900/70">
          <h3 className="font-semibold text-teal-100">Recent Transactions</h3>
        </div>
        <div className="divide-y divide-slate-800/80">
          {transactions.length === 0 && (
            <div className="p-4 text-sm text-teal-200">No transactions found.</div>
          )}
          {transactions.map(tx => (
            <div key={tx.id} className="p-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${typeTag(tx.type)}`}>
                  {tx.type.replace('_', ' ')}
                </span>
                <div>
                  <p className="font-medium text-teal-50">₦{(tx.amount || 0).toLocaleString()}</p>
                  <p className="text-teal-300/80">{tx.description || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-teal-300/80">
                  <p className="capitalize">{tx.status}</p>
                <p className="text-xs">{formatDate(tx.createdAt)}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedTransaction(tx);
                    setShowReportIssue(true);
                  }}
                  className="px-3 py-1 text-xs border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Report an issue with this transaction"
                >
                  Report Issue
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Report Issue Modal */}
      {showReportIssue && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <SupportTicket
              initialData={{
                transactionId: selectedTransaction.id,
                category: 'payment',
                priority: 'high',
                transactionDetails: {
                  amount: selectedTransaction.amount,
                  type: selectedTransaction.type,
                  status: selectedTransaction.status,
                  description: selectedTransaction.description
                }
              }}
              onTicketCreated={() => {
                setShowReportIssue(false);
                setSelectedTransaction(null);
                alert('Issue reported successfully! Our support team will review it shortly.');
              }}
              onClose={() => {
                setShowReportIssue(false);
                setSelectedTransaction(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default Wallet



import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const AccountSettingsModal = ({ isOpen, onClose }) => {
  const { currentUser, userProfile, updateUserProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [profileForm, setProfileForm] = useState({
    displayName: userProfile?.displayName || currentUser?.displayName || '',
    phone: userProfile?.phone || '',
    country: userProfile?.country || ''
  })

  const [notificationForm, setNotificationForm] = useState({
    emailNotifications: userProfile?.preferences?.emailNotifications ?? true,
    smsNotifications: userProfile?.preferences?.smsNotifications ?? false,
    orderUpdates: userProfile?.preferences?.orderUpdates ?? true
  })

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateUserProfile({
        displayName: profileForm.displayName,
        phone: profileForm.phone,
        country: profileForm.country,
        preferences: {
          ...(userProfile?.preferences || {}),
          emailNotifications: notificationForm.emailNotifications,
          smsNotifications: notificationForm.smsNotifications,
          orderUpdates: notificationForm.orderUpdates
        },
        updatedAt: new Date()
      })
      setSuccess('Settings saved')
      setTimeout(() => onClose(), 1000)
    } catch (e) {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="p-6">
          <div className="flex border-b mb-6">
            {[
              { id: 'profile', label: 'Profile' },
              { id: 'notifications', label: 'Notifications' },
              { id: 'security', label: 'Security' },
              { id: 'payouts', label: 'Payouts' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium mr-4 ${
                  activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-800">{error}</div>
          )}
          {success && (
            <div className="p-3 mb-4 bg-green-50 border border-green-200 rounded text-sm text-green-800">{success}</div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={profileForm.displayName}
                  onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={profileForm.country}
                  onChange={e => setProfileForm({ ...profileForm, country: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notificationForm.emailNotifications}
                  onChange={e => setNotificationForm({ ...notificationForm, emailNotifications: e.target.checked })}
                />
                <span>Email notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notificationForm.smsNotifications}
                  onChange={e => setNotificationForm({ ...notificationForm, smsNotifications: e.target.checked })}
                />
                <span>SMS notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notificationForm.orderUpdates}
                  onChange={e => setNotificationForm({ ...notificationForm, orderUpdates: e.target.checked })}
                />
                <span>Order updates</span>
              </label>
            </div>
          )}

          {activeTab === 'security' && (
            <SecuritySettings onSaved={() => setSuccess('Security settings updated')} onError={setError} />
          )}

          {activeTab === 'payouts' && (
            <PayoutSettings onSaved={() => setSuccess('Payout details saved')} onError={setError} />
          )}

          <div className="flex items-center justify-end gap-3 pt-6 border-t mt-6">
            <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountSettingsModal

// --- Security settings subcomponent ---
const SecuritySettings = ({ onSaved, onError }) => {
  const { currentUser } = useAuth()
  const [email, setEmail] = useState(currentUser?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const updateEmail = async () => {
    try {
      setSaving(true)
      setMsg('')
      const { getAuth, updateEmail: fbUpdateEmail, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth')
      const auth = getAuth()
      if (!auth.currentUser) throw new Error('Not authenticated')
      if (!currentPassword) throw new Error('Enter current password to re-authenticate')
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, cred)
      if (email && email !== auth.currentUser.email) {
        await fbUpdateEmail(auth.currentUser, email)
      }
      setMsg('Email updated')
      onSaved?.()
    } catch (e) {
      onError?.(e.message || 'Failed to update email')
    } finally {
      setSaving(false)
    }
  }

  const updatePassword = async () => {
    try {
      setSaving(true)
      setMsg('')
      const { getAuth, updatePassword: fbUpdatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth')
      const auth = getAuth()
      if (!auth.currentUser) throw new Error('Not authenticated')
      if (!currentPassword) throw new Error('Enter current password to re-authenticate')
      if (!newPassword || newPassword.length < 6) throw new Error('New password must be at least 6 characters')
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, cred)
      await fbUpdatePassword(auth.currentUser, newPassword)
      setMsg('Password updated')
      onSaved?.()
    } catch (e) {
      onError?.(e.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">{msg}</div>
      )}
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">Change Email</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="New email"
          />
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="Current password (for re-auth)"
          />
        </div>
        <div className="mt-2">
          <button onClick={updateEmail} disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">Update Email</button>
        </div>
      </div>

      <div className="pt-4 border-t">
        <h4 className="font-semibold text-gray-900 mb-2">Change Password</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="New password"
          />
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="Current password (for re-auth)"
          />
        </div>
        <div className="mt-2">
          <button onClick={updatePassword} disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">Update Password</button>
        </div>
      </div>

      <div className="pt-4 border-t">
        <h4 className="font-semibold text-gray-900 mb-2">Two-Factor Authentication (Coming Soon)</h4>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={twoFAEnabled} onChange={e => setTwoFAEnabled(e.target.checked)} disabled />
          <span>Enable TOTP (Authenticator App)</span>
        </label>
        <p className="text-sm text-gray-500 mt-1">We are rolling out 2FA soon to enhance your account security.</p>
      </div>

      <div className="pt-4 border-t">
        <h4 className="font-semibold text-gray-900 mb-2">Payment Methods (Coming Soon)</h4>
        <p className="text-sm text-gray-600">Save bank or mobile money details for faster payouts and checkouts.</p>
      </div>
    </div>
  )
}

// --- Payout settings subcomponent ---
const PayoutSettings = ({ onSaved, onError }) => {
  const { currentUser, updateUserProfile, userProfile } = useAuth()
  const [method, setMethod] = useState(userProfile?.payout?.method || 'bank')
  const [accountName, setAccountName] = useState(userProfile?.payout?.accountName || '')
  const [accountNumber, setAccountNumber] = useState(userProfile?.payout?.accountNumber || '')
  const [bankName, setBankName] = useState(userProfile?.payout?.bankName || '')
  const [provider, setProvider] = useState(userProfile?.payout?.provider || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    try {
      setSaving(true)
      await updateUserProfile({
        payout: {
          method,
          accountName,
          accountNumber,
          bankName: method === 'bank' ? bankName : null,
          provider: method === 'mobile_money' ? provider : null,
          updatedAt: new Date()
        }
      })
      onSaved?.()
    } catch (e) {
      onError?.(e.message || 'Failed to save payout details')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
          <select value={method} onChange={(e)=>setMethod(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2">
            <option value="bank">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
          <input value={accountName} onChange={(e)=>setAccountName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
          <input value={accountNumber} onChange={(e)=>setAccountNumber(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
        </div>
        {method === 'bank' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
            <input value={bankName} onChange={(e)=>setBankName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <input value={provider} onChange={(e)=>setProvider(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
          </div>
        )}
      </div>
      <div>
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">Save Payout Details</button>
      </div>
    </div>
  )
}



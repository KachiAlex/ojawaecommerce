/**
 * Promo Campaign Manager Component
 * Admin interface for creating and managing promotional campaigns
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import promoCampaignService, { CAMPAIGN_TYPES, CAMPAIGN_STATUS, VENDOR_PARTICIPATION } from '../../services/promoCampaignService';

const PromoCampaignManager = () => {
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [compliance, setCompliance] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: CAMPAIGN_TYPES.BLACK_FRIDAY,
    status: CAMPAIGN_STATUS.DRAFT,
    participationType: VENDOR_PARTICIPATION.OPT_IN,
    discountType: 'percentage', // 'percentage' or 'fixed'
    discountValue: 10, // 10% or fixed amount
    minDiscount: 0,
    maxDiscount: 100,
    startDate: '',
    endDate: '',
    startTime: '00:00',
    endTime: '23:59',
    categories: [], // Specific categories (empty = all)
    invitedVendors: [], // For INVITED participation type
    requiredMinimumProducts: 1, // Minimum products vendor must add
    bannerImage: '',
    bannerText: '',
    featured: false
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const allCampaigns = await promoCampaignService.getCampaigns();
      setCampaigns(allCampaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      alert('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      // Combine date and time
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      if (endDateTime <= startDateTime) {
        alert('End date/time must be after start date/time');
        return;
      }

      const campaignData = {
        ...formData,
        startDate: startDateTime,
        endDate: endDateTime,
        createdBy: currentUser.uid
      };

      const campaignId = await promoCampaignService.createCampaign(campaignData);
      
      // If required participation, notify vendors
      if (formData.participationType === VENDOR_PARTICIPATION.REQUIRED) {
        await promoCampaignService.notifyVendors(campaignId, 'required');
      } else if (formData.participationType === VENDOR_PARTICIPATION.OPT_IN) {
        await promoCampaignService.notifyVendors(campaignId, 'invitation');
      }

      alert('Campaign created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    }
  };

  const handleUpdateCampaign = async (campaignId, updates) => {
    try {
      await promoCampaignService.updateCampaign(campaignId, updates);
      alert('Campaign updated successfully!');
      loadCampaigns();
    } catch (error) {
      console.error('Error updating campaign:', error);
      alert('Failed to update campaign');
    }
  };

  const handleViewCompliance = async (campaignId) => {
    try {
      const complianceData = await promoCampaignService.getVendorCompliance(campaignId);
      setCompliance(complianceData);
      setSelectedCampaign(campaignId);
    } catch (error) {
      console.error('Error fetching compliance:', error);
      alert('Failed to load compliance data');
    }
  };

  const handleActivateCampaign = async (campaignId) => {
    if (!confirm('Activate this campaign? Vendors will be notified.')) return;
    
    try {
      await handleUpdateCampaign(campaignId, { status: CAMPAIGN_STATUS.ACTIVE });
      await promoCampaignService.notifyVendors(campaignId, 'started');
    } catch (error) {
      console.error('Error activating campaign:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: CAMPAIGN_TYPES.BLACK_FRIDAY,
      status: CAMPAIGN_STATUS.DRAFT,
      participationType: VENDOR_PARTICIPATION.OPT_IN,
      discountType: 'percentage',
      discountValue: 10,
      minDiscount: 0,
      maxDiscount: 100,
      startDate: '',
      endDate: '',
      startTime: '00:00',
      endTime: '23:59',
      categories: [],
      invitedVendors: [],
      requiredMinimumProducts: 1,
      bannerImage: '',
      bannerText: '',
      featured: false
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return <div className="p-6">Loading campaigns...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Promotional Campaigns</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          + Create Campaign
        </button>
      </div>

      {/* Campaigns List */}
      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="border rounded-lg p-4 bg-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{campaign.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${
                    campaign.status === CAMPAIGN_STATUS.ACTIVE ? 'bg-green-100 text-green-800' :
                    campaign.status === CAMPAIGN_STATUS.DRAFT ? 'bg-gray-100 text-gray-800' :
                    campaign.status === CAMPAIGN_STATUS.COMPLETED ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {campaign.status}
                  </span>
                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                    {campaign.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Discount: {campaign.discountValue}{campaign.discountType === 'percentage' ? '%' : ' NGN'}</span>
                  <span>Participation: {campaign.participationType}</span>
                  <span>Start: {formatDate(campaign.startDate)}</span>
                  <span>End: {formatDate(campaign.endDate)}</span>
                  <span>Vendors: {campaign.participationCount || 0}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewCompliance(campaign.id)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Compliance
                </button>
                {campaign.status === CAMPAIGN_STATUS.DRAFT && (
                  <button
                    onClick={() => handleActivateCampaign(campaign.id)}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Activate
                  </button>
                )}
                {campaign.status === CAMPAIGN_STATUS.ACTIVE && (
                  <button
                    onClick={() => handleUpdateCampaign(campaign.id, { status: CAMPAIGN_STATUS.PAUSED })}
                    className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                  >
                    Pause
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Compliance Modal */}
      {compliance && selectedCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Vendor Compliance Report</h3>
              <button onClick={() => setCompliance(null)} className="text-gray-500">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">{compliance.totalVendors}</div>
                  <div className="text-sm text-gray-600">Total Vendors</div>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{compliance.participatingVendors}</div>
                  <div className="text-sm text-gray-600">Participating</div>
                </div>
                <div className="p-4 bg-red-50 rounded">
                  <div className="text-2xl font-bold text-red-600">{compliance.nonParticipatingVendors}</div>
                  <div className="text-sm text-gray-600">Not Participating</div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-lg font-semibold mb-2">Compliance Rate</div>
                <div className="text-3xl font-bold text-emerald-600">{compliance.complianceRate.toFixed(1)}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${compliance.complianceRate}%` }}
                  ></div>
                </div>
              </div>
              {compliance.nonParticipatingVendors > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Non-Participating Vendors</h4>
                  <button
                    onClick={() => promoCampaignService.notifyVendors(selectedCampaign, 'reminder')}
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                  >
                    Send Reminder
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Create Promotional Campaign</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500">✕</button>
            </div>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Campaign Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., Black Friday 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Campaign Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value={CAMPAIGN_TYPES.BLACK_FRIDAY}>Black Friday</option>
                    <option value={CAMPAIGN_TYPES.FLASH_SALE}>Flash Sale</option>
                    <option value={CAMPAIGN_TYPES.HOLIDAY_SALE}>Holiday Sale</option>
                    <option value={CAMPAIGN_TYPES.SEASONAL}>Seasonal</option>
                    <option value={CAMPAIGN_TYPES.CUSTOM}>Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Campaign description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Participation Type *</label>
                <select
                  required
                  value={formData.participationType}
                  onChange={(e) => setFormData({ ...formData, participationType: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value={VENDOR_PARTICIPATION.OPT_IN}>Opt-In (Vendors choose to participate)</option>
                  <option value={VENDOR_PARTICIPATION.REQUIRED}>Required (All vendors must participate)</option>
                  <option value={VENDOR_PARTICIPATION.INVITED}>Invited (Only invited vendors)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.participationType === VENDOR_PARTICIPATION.REQUIRED && 
                    '⚠️ All approved vendors will be automatically enrolled and notified'}
                  {formData.participationType === VENDOR_PARTICIPATION.OPT_IN && 
                    'Vendors will receive an invitation and can choose to participate'}
                  {formData.participationType === VENDOR_PARTICIPATION.INVITED && 
                    'Only vendors in the invited list can participate'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount Type *</label>
                  <select
                    required
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (NGN)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min Products Required</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.requiredMinimumProducts}
                    onChange={(e) => setFormData({ ...formData, requiredMinimumProducts: parseInt(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Create Campaign
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCampaignManager;

/**
 * Vendor Promo Campaigns Component
 * Allows vendors to view and participate in promotional campaigns
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import promoCampaignService, { CAMPAIGN_STATUS } from '../../services/promoCampaignService';
import firebaseService from '../../services/firebaseService';

const VendorPromoCampaigns = () => {
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [participating, setParticipating] = useState({});

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load active campaigns
      const activeCampaigns = await promoCampaignService.getActiveCampaigns();
      setCampaigns(activeCampaigns);

      // Load vendor's products
      const products = await firebaseService.products.getByVendor(currentUser.uid);
      setMyProducts(products || []);

      // Check participation status for each campaign
      const participationMap = {};
      for (const campaign of activeCampaigns) {
        const participation = await promoCampaignService.getVendorParticipation(campaign.id, currentUser.uid);
        participationMap[campaign.id] = participation;
      }
      setParticipating(participationMap);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCampaign = async (campaign) => {
    try {
      // Check if already participating
      if (participating[campaign.id]) {
        // If already participating but no products added, allow adding products
        const campaignProducts = myProducts.filter(p => isProductInCampaign(p, campaign.id));
        if (campaignProducts.length === 0) {
          setSelectedCampaign(campaign);
          setSelectedProducts([]);
          return;
        }
        alert('You are already participating in this campaign');
        return;
      }

      // Check if required participation
      if (campaign.participationType === 'required') {
        // Auto-join for required campaigns
        await promoCampaignService.addVendorParticipation(campaign.id, currentUser.uid, {
          autoJoined: true
        });
        // Then show product selection
        setSelectedCampaign(campaign);
        setSelectedProducts([]);
      } else {
        // Show product selection modal for opt-in
        setSelectedCampaign(campaign);
        setSelectedProducts([]);
      }
    } catch (error) {
      console.error('Error joining campaign:', error);
      alert('Failed to join campaign');
    }
  };

  const handleApplyDiscounts = async () => {
    if (!selectedCampaign || selectedProducts.length === 0) {
      alert('Please select at least one product');
      return;
    }

    // Check minimum products requirement
    if (selectedCampaign.requiredMinimumProducts > selectedProducts.length) {
      alert(`You must add at least ${selectedCampaign.requiredMinimumProducts} products to this campaign`);
      return;
    }

    try {
      // Add vendor participation
      const participationId = await promoCampaignService.addVendorParticipation(
        selectedCampaign.id,
        currentUser.uid,
        {
          productsCount: selectedProducts.length
        }
      );

      // Apply discounts to selected products
      const discountConfig = {
        type: selectedCampaign.discountType,
        value: selectedCampaign.discountValue
      };

      let appliedCount = 0;
      for (const productId of selectedProducts) {
        try {
          await promoCampaignService.applyCampaignToProduct(selectedCampaign.id, productId, discountConfig);
          appliedCount++;
        } catch (error) {
          console.error(`Error applying discount to product ${productId}:`, error);
        }
      }

      alert(`Successfully applied discounts to ${appliedCount} products!`);
      setSelectedCampaign(null);
      setSelectedProducts([]);
      loadData(); // Refresh
    } catch (error) {
      console.error('Error applying discounts:', error);
      alert('Failed to apply discounts');
    }
  };

  const handleRemoveParticipation = async (campaignId) => {
    if (!confirm('Remove your products from this campaign? Discounts will be removed.')) return;

    try {
      // Get products with this campaign
      const productsWithCampaign = myProducts.filter(
        p => p.promoCampaigns && p.promoCampaigns[campaignId]
      );

      // Remove campaign from products
      for (const product of productsWithCampaign) {
        await promoCampaignService.removeCampaignFromProduct(product.id, campaignId);
      }

      alert('Removed from campaign successfully');
      loadData(); // Refresh
    } catch (error) {
      console.error('Error removing participation:', error);
      alert('Failed to remove participation');
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const isProductInCampaign = (product, campaignId) => {
    return product.promoCampaigns && product.promoCampaigns[campaignId];
  };

  const getDiscountAmount = (product, campaign) => {
    if (!campaign || !isProductInCampaign(product, campaign.id)) return 0;
    const originalPrice = product.originalPrice || product.price;
    if (campaign.discountType === 'percentage') {
      return (originalPrice * campaign.discountValue) / 100;
    }
    return campaign.discountValue;
  };

  if (loading) {
    return <div className="p-6">Loading campaigns...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Promotional Campaigns</h2>
        <p className="text-gray-600">Participate in campaigns to boost your sales with special discounts</p>
      </div>

      {/* Active Campaigns */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No active campaigns at the moment</p>
          </div>
        ) : (
          campaigns.map((campaign) => {
            const participation = participating[campaign.id];
            const isParticipating = !!participation;
            const campaignProducts = myProducts.filter(p => isProductInCampaign(p, campaign.id));

            return (
              <div key={campaign.id} className="border rounded-lg p-6 bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{campaign.name}</h3>
                      <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded">
                        {campaign.type.replace('_', ' ')}
                      </span>
                      {campaign.participationType === 'required' && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4">{campaign.description}</p>
                    
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-500">Discount</div>
                        <div className="text-lg font-bold text-emerald-600">
                          {campaign.discountValue}
                          {campaign.discountType === 'percentage' ? '%' : ' NGN'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Start Date</div>
                        <div className="text-sm font-medium">
                          {new Date(campaign.startDate?.toDate?.() || campaign.startDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">End Date</div>
                        <div className="text-sm font-medium">
                          {new Date(campaign.endDate?.toDate?.() || campaign.endDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Products Added</div>
                        <div className="text-lg font-bold">{campaignProducts.length}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {isParticipating ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-green-800">✓ Participating</div>
                          <div className="text-sm text-green-600">
                            {campaignProducts.length} product(s) in this campaign
                          </div>
                        </div>
                        {campaign.participationType !== 'required' && (
                          <button
                            onClick={() => handleRemoveParticipation(campaign.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Products in Campaign */}
                    {campaignProducts.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Products with Discount:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {campaignProducts.map((product) => {
                            const discount = getDiscountAmount(product, campaign);
                            const originalPrice = product.originalPrice || product.price;
                            const discountedPrice = product.price;

                            return (
                              <div key={product.id} className="border rounded p-3 bg-gray-50">
                                <div className="font-medium text-sm mb-1 line-clamp-2">{product.name}</div>
                                <div className="text-xs text-gray-500 line-through">₦{originalPrice?.toLocaleString()}</div>
                                <div className="font-bold text-emerald-600">₦{discountedPrice?.toLocaleString()}</div>
                                <div className="text-xs text-red-600 font-medium">-{discount.toLocaleString()} off</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {campaign.participationType === 'required' 
                        ? '⚠️ Your participation is required'
                        : 'Join this campaign to boost your sales'}
                    </div>
                    <button
                      onClick={() => handleJoinCampaign(campaign)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    >
                      {campaign.participationType === 'required' ? 'Join Now' : 'Join Campaign'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Product Selection Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Select Products for {selectedCampaign.name}</h3>
              <button onClick={() => setSelectedCampaign(null)} className="text-gray-500">✕</button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Select products to apply {selectedCampaign.discountValue}
                {selectedCampaign.discountType === 'percentage' ? '%' : ' NGN'} discount
              </p>
              {selectedCampaign.requiredMinimumProducts > 0 && (
                <p className="text-sm text-yellow-600">
                  Minimum {selectedCampaign.requiredMinimumProducts} product(s) required
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto mb-4">
              {myProducts.map((product) => {
                const isSelected = selectedProducts.includes(product.id);
                const originalPrice = product.price;
                const discount = selectedCampaign.discountType === 'percentage'
                  ? (originalPrice * selectedCampaign.discountValue) / 100
                  : selectedCampaign.discountValue;
                const newPrice = originalPrice - discount;

                return (
                  <div
                    key={product.id}
                    onClick={() => toggleProductSelection(product.id)}
                    className={`border rounded p-3 cursor-pointer transition-all ${
                      isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProductSelection(product.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">{product.name}</div>
                        <div className="text-xs text-gray-500 line-through">₦{originalPrice?.toLocaleString()}</div>
                        <div className="font-bold text-emerald-600">₦{newPrice?.toLocaleString()}</div>
                        <div className="text-xs text-red-600">-₦{discount?.toLocaleString()} off</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApplyDiscounts}
                disabled={selectedProducts.length < selectedCampaign.requiredMinimumProducts}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Apply Discount to {selectedProducts.length} Product(s)
              </button>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPromoCampaigns;

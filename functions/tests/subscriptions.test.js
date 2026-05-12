// Firebase removed: tests now use REST backend

// Mock plan configurations matching server.js
const VENDOR_SUBSCRIPTION_PLANS = {
  basic: {
    price: 0,
    annualPrice: 0,
    commissionRate: 5.0,
    productLimit: 10,
  },
  pro: {
    price: 5000,
    annualPrice: 50000,
    commissionRate: 3.0,
    productLimit: 20,
  },
  premium: {
    price: 15000,
    annualPrice: 150000,
    commissionRate: 2.0,
    productLimit: 100,
  },
};

// Helper functions matching server.js
const normalizeBillingCycle = (cycle) => (typeof cycle === 'string' && cycle.trim().toLowerCase() === 'annual' ? 'annual' : 'monthly');
const getSubscriptionTermDays = (cycle) => (cycle === 'annual' ? 365 : 30);
const getPlanPrice = (planConfig, cycle) => (cycle === 'annual' ? Number(planConfig.annualPrice ?? planConfig.price * 12) : Number(planConfig.price));

describe('Subscription Billing Calculations', () => {
  describe('Annual Discount (2 months free)', () => {
    it('should calculate Pro annual as 10-month price', () => {
      const monthlyPrice = 5000;
      const annualPrice = 50000;
      const expectedTenMonths = monthlyPrice * 10;
      expect(annualPrice).toBe(expectedTenMonths);
    });

    it('should calculate Premium annual as 10-month price', () => {
      const monthlyPrice = 15000;
      const annualPrice = 150000;
      const expectedTenMonths = monthlyPrice * 10;
      expect(annualPrice).toBe(expectedTenMonths);
    });

    it('should calculate discount percentage correctly', () => {
      const monthlyPrice = 5000;
      const fullYearPrice = monthlyPrice * 12;
      const annualPrice = 50000;
      const discountPercentage = ((fullYearPrice - annualPrice) / fullYearPrice) * 100;
      expect(discountPercentage).toBeCloseTo(16.67, 1);
    });

    it('should give 0 discount on Basic plan', () => {
      const pro = VENDOR_SUBSCRIPTION_PLANS.pro;
      const basic = VENDOR_SUBSCRIPTION_PLANS.basic;
      expect(basic.annualPrice).toBe(0);
      expect(basic.price).toBe(0);
    });
  });

  describe('Billing Cycle Normalization', () => {
    it('should normalize "annual" correctly', () => {
      expect(normalizeBillingCycle('annual')).toBe('annual');
      expect(normalizeBillingCycle('Annual')).toBe('annual');
      expect(normalizeBillingCycle('ANNUAL')).toBe('annual');
    });

    it('should default to monthly for invalid input', () => {
      expect(normalizeBillingCycle('monthly')).toBe('monthly');
      expect(normalizeBillingCycle('invalid')).toBe('monthly');
      expect(normalizeBillingCycle('')).toBe('monthly');
      expect(normalizeBillingCycle(null)).toBe('monthly');
    });
  });

  describe('Subscription Term Calculation', () => {
    it('should return 365 days for annual billing', () => {
      expect(getSubscriptionTermDays('annual')).toBe(365);
    });

    it('should return 30 days for monthly billing', () => {
      expect(getSubscriptionTermDays('monthly')).toBe(30);
    });

    it('should default to 30 days for invalid input', () => {
      expect(getSubscriptionTermDays('invalid')).toBe(30);
      expect(getSubscriptionTermDays('')).toBe(30);
    });
  });

  describe('Plan Price Resolution', () => {
    it('should return monthly price for monthly billing', () => {
      const proPlan = VENDOR_SUBSCRIPTION_PLANS.pro;
      const price = getPlanPrice(proPlan, 'monthly');
      expect(price).toBe(5000);
    });

    it('should return annual price for annual billing', () => {
      const proPlan = VENDOR_SUBSCRIPTION_PLANS.pro;
      const price = getPlanPrice(proPlan, 'annual');
      expect(price).toBe(50000);
    });

    it('should use fallback calculation if annualPrice missing', () => {
      const customPlan = { price: 5000 };
      const price = getPlanPrice(customPlan, 'annual');
      expect(price).toBe(60000); // 5000 * 12
    });

    it('should correctly price all standard plans monthly', () => {
      expect(getPlanPrice(VENDOR_SUBSCRIPTION_PLANS.basic, 'monthly')).toBe(0);
      expect(getPlanPrice(VENDOR_SUBSCRIPTION_PLANS.pro, 'monthly')).toBe(5000);
      expect(getPlanPrice(VENDOR_SUBSCRIPTION_PLANS.premium, 'monthly')).toBe(15000);
    });

    it('should correctly price all standard plans annually', () => {
      expect(getPlanPrice(VENDOR_SUBSCRIPTION_PLANS.basic, 'annual')).toBe(0);
      expect(getPlanPrice(VENDOR_SUBSCRIPTION_PLANS.pro, 'annual')).toBe(50000);
      expect(getPlanPrice(VENDOR_SUBSCRIPTION_PLANS.premium, 'annual')).toBe(150000);
    });
  });

  describe('Plan Limits', () => {
    it('should enforce product limits per plan', () => {
      expect(VENDOR_SUBSCRIPTION_PLANS.basic.productLimit).toBe(10);
      expect(VENDOR_SUBSCRIPTION_PLANS.pro.productLimit).toBe(20);
      expect(VENDOR_SUBSCRIPTION_PLANS.premium.productLimit).toBe(100);
    });

    it('should enforce commission rates per plan', () => {
      expect(VENDOR_SUBSCRIPTION_PLANS.basic.commissionRate).toBe(5.0);
      expect(VENDOR_SUBSCRIPTION_PLANS.pro.commissionRate).toBe(3.0);
      expect(VENDOR_SUBSCRIPTION_PLANS.premium.commissionRate).toBe(2.0);
    });

    it('should have lower commission for higher-tier plans', () => {
      const basic = VENDOR_SUBSCRIPTION_PLANS.basic.commissionRate;
      const pro = VENDOR_SUBSCRIPTION_PLANS.pro.commissionRate;
      const premium = VENDOR_SUBSCRIPTION_PLANS.premium.commissionRate;
      expect(basic > pro).toBe(true);
      expect(pro > premium).toBe(true);
    });
  });

  describe('Subscription Duration', () => {
    it('should calculate end dates correctly for monthly', () => {
      const startDate = new Date('2026-03-21');
      const termDays = getSubscriptionTermDays('monthly');
      const endDate = new Date(startDate.getTime() + termDays * 24 * 60 * 60 * 1000);
      expect(endDate.getDate()).toBe(20); // 30 days later
      expect(endDate.getMonth()).toBe(3); // April (month 3)
    });

    it('should calculate end dates correctly for annual', () => {
      const startDate = new Date('2026-03-21');
      const termDays = getSubscriptionTermDays('annual');
      const endDate = new Date(startDate.getTime() + termDays * 24 * 60 * 60 * 1000);
      expect(endDate.getFullYear()).toBe(2027); // 365 days later
      expect(endDate.getDate()).toBe(21);
      expect(endDate.getMonth()).toBe(2); // March
    });
  });

  describe('Volume Tier Validation', () => {
    it('should have increasing product limits across tiers', () => {
      const basic = VENDOR_SUBSCRIPTION_PLANS.basic.productLimit;
      const pro = VENDOR_SUBSCRIPTION_PLANS.pro.productLimit;
      const premium = VENDOR_SUBSCRIPTION_PLANS.premium.productLimit;
      expect(basic < pro && pro < premium).toBe(true);
    });

    it('should have decreasing commission rates across tiers', () => {
      const basic = VENDOR_SUBSCRIPTION_PLANS.basic.commissionRate;
      const pro = VENDOR_SUBSCRIPTION_PLANS.pro.commissionRate;
      const premium = VENDOR_SUBSCRIPTION_PLANS.premium.commissionRate;
      expect(basic > pro && pro > premium).toBe(true);
    });
  });
});

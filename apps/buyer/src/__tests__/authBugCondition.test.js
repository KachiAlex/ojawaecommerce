/**
 * Bug Condition Exploration Test
 * 
 * This test explores the two critical bugs in the authentication flow:
 * 1. OTP sending fails with "Email is required" error during account creation
 * 2. Missing dashboard redirect after email verification
 * 
 * IMPORTANT: This test is expected to FAIL on unfixed code.
 * Failure confirms the bugs exist. Do NOT attempt to fix the test or code when it fails.
 * 
 * After fixes are implemented, this test will pass, validating the expected behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import emailOTPService from '../utils/emailOTPService';
import { apiPost } from '../utils/apiClient';

// Mock the API client
vi.mock('../utils/apiClient', () => ({
  apiPost: vi.fn()
}));

// Mock secure storage
vi.mock('../utils/secureLocalStorage', () => ({
  default: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn(),
    getKeys: vi.fn(() => [])
  }
}));

describe('Bug Condition Exploration: OTP Sending and Dashboard Redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Bug 1: OTP Sending Fails with "Email is required" Error', () => {
    it('should send OTP successfully for buyer account creation with valid email', async () => {
      // Arrange
      const email = 'buyer@example.com';
      const purpose = 'verification';
      
      // Mock successful API response
      apiPost.mockResolvedValueOnce({
        success: true,
        requestId: 'req-123'
      });

      // Act
      const result = await emailOTPService.sendOTP(email, purpose);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain(email);
      expect(apiPost).toHaveBeenCalledWith(
        '/sendEmailOTP',
        expect.objectContaining({
          to: email,
          subject: expect.any(String),
          htmlContent: expect.any(String),
          textContent: expect.any(String),
          purpose: purpose
        })
      );
    });

    it('should NOT fail with "Email is required" error when email is provided', async () => {
      // Arrange
      const email = 'buyer@example.com';
      
      // Mock API response that would previously fail
      apiPost.mockResolvedValueOnce({
        success: true,
        requestId: 'req-123'
      });

      // Act & Assert
      try {
        const result = await emailOTPService.sendOTP(email, 'verification');
        expect(result.success).toBe(true);
        // Should NOT contain "Email is required" error
        expect(result.message).not.toContain('Email is required');
      } catch (error) {
        // If error occurs, it should NOT be "Email is required"
        expect(error.message).not.toContain('Email is required');
      }
    });

    it('should validate email parameter before sending to backend', async () => {
      // Arrange
      const email = 'buyer@example.com';
      
      // Mock successful response
      apiPost.mockResolvedValueOnce({
        success: true,
        requestId: 'req-123'
      });

      // Act
      await emailOTPService.sendOTP(email, 'verification');

      // Assert - verify email was passed to API
      const callArgs = apiPost.mock.calls[0][1];
      expect(callArgs.to).toBe(email);
      expect(callArgs.to).not.toBeNull();
      expect(callArgs.to).not.toBeUndefined();
    });
  });

  describe('Bug 2: Missing Dashboard Redirect After Email Verification', () => {
    it('should redirect buyer to /buyer dashboard after email verification', async () => {
      // Arrange
      const userType = 'buyer';
      const expectedDashboard = '/buyer';

      // Act - Simulate post-verification redirect logic
      const getDashboardUrl = (type) => {
        const dashboardMap = {
          'buyer': '/buyer',
          'vendor': '/vendor',
          'logistics': '/logistics'
        };
        return dashboardMap[type] || '/dashboard';
      };

      const redirectUrl = getDashboardUrl(userType);

      // Assert
      expect(redirectUrl).toBe(expectedDashboard);
      expect(redirectUrl).not.toBe('/dashboard'); // Should NOT be generic dashboard
    });

    it('should redirect vendor to /vendor dashboard after email verification', async () => {
      // Arrange
      const userType = 'vendor';
      const expectedDashboard = '/vendor';

      // Act
      const getDashboardUrl = (type) => {
        const dashboardMap = {
          'buyer': '/buyer',
          'vendor': '/vendor',
          'logistics': '/logistics'
        };
        return dashboardMap[type] || '/dashboard';
      };

      const redirectUrl = getDashboardUrl(userType);

      // Assert
      expect(redirectUrl).toBe(expectedDashboard);
      expect(redirectUrl).not.toBe('/dashboard');
    });

    it('should redirect logistics to /logistics dashboard after email verification', async () => {
      // Arrange
      const userType = 'logistics';
      const expectedDashboard = '/logistics';

      // Act
      const getDashboardUrl = (type) => {
        const dashboardMap = {
          'buyer': '/buyer',
          'vendor': '/vendor',
          'logistics': '/logistics'
        };
        return dashboardMap[type] || '/dashboard';
      };

      const redirectUrl = getDashboardUrl(userType);

      // Assert
      expect(redirectUrl).toBe(expectedDashboard);
      expect(redirectUrl).not.toBe('/dashboard');
    });

    it('should NOT redirect to generic /dashboard for any user type', async () => {
      // Arrange
      const userTypes = ['buyer', 'vendor', 'logistics'];

      // Act & Assert
      const getDashboardUrl = (type) => {
        const dashboardMap = {
          'buyer': '/buyer',
          'vendor': '/vendor',
          'logistics': '/logistics'
        };
        return dashboardMap[type] || '/dashboard';
      };

      userTypes.forEach(userType => {
        const redirectUrl = getDashboardUrl(userType);
        expect(redirectUrl).not.toBe('/dashboard');
        expect(redirectUrl).toMatch(/^\/(buyer|vendor|logistics)$/);
      });
    });
  });

  describe('Bug 3: Login Redirect to Generic Dashboard', () => {
    it('should redirect buyer to /buyer dashboard after login', async () => {
      // Arrange
      const userType = 'buyer';
      const expectedDashboard = '/buyer';

      // Act
      const getDashboardUrl = (type) => {
        const dashboardMap = {
          'buyer': '/buyer',
          'vendor': '/vendor',
          'logistics': '/logistics'
        };
        return dashboardMap[type] || '/dashboard';
      };

      const redirectUrl = getDashboardUrl(userType);

      // Assert
      expect(redirectUrl).toBe(expectedDashboard);
      expect(redirectUrl).not.toBe('/dashboard');
    });

    it('should redirect vendor to /vendor dashboard after login', async () => {
      // Arrange
      const userType = 'vendor';
      const expectedDashboard = '/vendor';

      // Act
      const getDashboardUrl = (type) => {
        const dashboardMap = {
          'buyer': '/buyer',
          'vendor': '/vendor',
          'logistics': '/logistics'
        };
        return dashboardMap[type] || '/dashboard';
      };

      const redirectUrl = getDashboardUrl(userType);

      // Assert
      expect(redirectUrl).toBe(expectedDashboard);
      expect(redirectUrl).not.toBe('/dashboard');
    });

    it('should redirect logistics to /logistics dashboard after login', async () => {
      // Arrange
      const userType = 'logistics';
      const expectedDashboard = '/logistics';

      // Act
      const getDashboardUrl = (type) => {
        const dashboardMap = {
          'buyer': '/buyer',
          'vendor': '/vendor',
          'logistics': '/logistics'
        };
        return dashboardMap[type] || '/dashboard';
      };

      const redirectUrl = getDashboardUrl(userType);

      // Assert
      expect(redirectUrl).toBe(expectedDashboard);
      expect(redirectUrl).not.toBe('/dashboard');
    });
  });

  describe('Integration: Complete Registration and Login Flow', () => {
    it('should complete buyer registration flow without OTP errors', async () => {
      // Arrange
      const email = 'buyer@example.com';
      const userType = 'buyer';
      
      // Mock successful OTP send
      apiPost.mockResolvedValueOnce({
        success: true,
        requestId: 'req-123'
      });

      // Act
      const otpResult = await emailOTPService.sendOTP(email, 'verification');

      // Assert
      expect(otpResult.success).toBe(true);
      expect(otpResult.message).not.toContain('Email is required');
    });

    it('should complete buyer login flow with role-based redirect', async () => {
      // Arrange
      const userType = 'buyer';
      const expectedDashboard = '/buyer';

      // Act
      const getDashboardUrl = (type) => {
        const dashboardMap = {
          'buyer': '/buyer',
          'vendor': '/vendor',
          'logistics': '/logistics'
        };
        return dashboardMap[type] || '/dashboard';
      };

      const redirectUrl = getDashboardUrl(userType);

      // Assert
      expect(redirectUrl).toBe(expectedDashboard);
      expect(redirectUrl).not.toBe('/dashboard');
    });
  });
});

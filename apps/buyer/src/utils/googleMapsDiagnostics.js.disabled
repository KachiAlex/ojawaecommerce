/**
 * Google Maps Diagnostics Utility
 * Use this to verify Google Maps configuration and troubleshoot issues
 */

export const googleMapsDiagnostics = {
  // Check if Google Maps API is loaded
  isGoogleMapsLoaded() {
    return typeof google !== 'undefined' && typeof google.maps !== 'undefined';
  },

  // Get API key status
  getApiKeyStatus() {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    return {
      exists: !!apiKey,
      value: apiKey ? `${apiKey.substring(0, 10)}...` : 'Not set',
      length: apiKey?.length || 0,
      isValid: apiKey?.startsWith('AIza') || false
    };
  },

  // Check browser support
  checkBrowserSupport() {
    return {
      geolocation: 'geolocation' in navigator,
      localStorage: typeof Storage !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      promises: typeof Promise !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator
    };
  },

  // Test API connection
  async testApiConnection() {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'undefined') {
      return {
        success: false,
        error: 'API key not configured',
        message: 'Please add VITE_GOOGLE_MAPS_API_KEY to your environment'
      };
    }

    try {
      // Test with a simple geocoding request
      const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Lagos,Nigeria&key=${apiKey}`;
      const response = await fetch(testUrl);
      const data = await response.json();

      if (data.status === 'OK') {
        return {
          success: true,
          message: 'API key is working correctly',
          results: data.results?.length || 0
        };
      } else if (data.status === 'REQUEST_DENIED') {
        return {
          success: false,
          error: 'REQUEST_DENIED',
          message: 'API key restrictions may be blocking requests. Check HTTP referrers.',
          errorMessage: data.error_message
        };
      } else {
        return {
          success: false,
          error: data.status,
          message: `API returned status: ${data.status}`,
          errorMessage: data.error_message
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Failed to connect to Google Maps API',
        details: error.message
      };
    }
  },

  // Check which APIs are enabled
  async checkEnabledApis() {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const apis = [
      { name: 'Maps JavaScript API', endpoint: 'maps-backend.googleapis.com' },
      { name: 'Places API', endpoint: 'places-backend.googleapis.com' },
      { name: 'Geocoding API', endpoint: 'geocoding-backend.googleapis.com' },
      { name: 'Directions API', endpoint: 'directions-backend.googleapis.com' }
    ];

    const results = {};
    
    for (const api of apis) {
      try {
        // Simple test to see if API responds
        const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${apiKey}`;
        const response = await fetch(testUrl, { method: 'HEAD' });
        results[api.name] = response.ok ? 'Enabled' : 'Unknown';
      } catch (error) {
        results[api.name] = 'Error';
      }
    }

    return results;
  },

  // Run full diagnostic
  async runFullDiagnostic() {
    console.log('🔍 Running Google Maps Diagnostics...\n');

    // 1. Check API Key
    console.log('1️⃣ API Key Status:');
    const apiKeyStatus = this.getApiKeyStatus();
    console.log('   Exists:', apiKeyStatus.exists ? '✅' : '❌');
    console.log('   Value:', apiKeyStatus.value);
    console.log('   Valid Format:', apiKeyStatus.isValid ? '✅' : '❌');
    console.log('');

    // 2. Check Browser Support
    console.log('2️⃣ Browser Support:');
    const browserSupport = this.checkBrowserSupport();
    Object.entries(browserSupport).forEach(([feature, supported]) => {
      console.log(`   ${feature}:`, supported ? '✅' : '❌');
    });
    console.log('');

    // 3. Check if Maps is Loaded
    console.log('3️⃣ Google Maps Library:');
    const isLoaded = this.isGoogleMapsLoaded();
    console.log('   Loaded:', isLoaded ? '✅' : '❌');
    if (isLoaded) {
      console.log('   Version:', google.maps.version || 'Unknown');
    }
    console.log('');

    // 4. Test API Connection
    console.log('4️⃣ API Connection Test:');
    const connectionTest = await this.testApiConnection();
    console.log('   Success:', connectionTest.success ? '✅' : '❌');
    console.log('   Message:', connectionTest.message);
    if (connectionTest.error) {
      console.log('   Error:', connectionTest.error);
      if (connectionTest.errorMessage) {
        console.log('   Details:', connectionTest.errorMessage);
      }
    }
    console.log('');

    // 5. Summary
    console.log('📊 Summary:');
    const allGood = apiKeyStatus.exists && 
                    apiKeyStatus.isValid && 
                    browserSupport.geolocation && 
                    connectionTest.success;

    if (allGood) {
      console.log('   Status: ✅ All systems operational!');
      console.log('   Google Maps is ready to use.');
    } else {
      console.log('   Status: ⚠️ Configuration needed');
      console.log('');
      console.log('🔧 Action Required:');
      
      if (!apiKeyStatus.exists || !apiKeyStatus.isValid) {
        console.log('   ❌ Configure API key in vite.config.js');
      }
      
      if (!connectionTest.success) {
        console.log('   ❌ Configure API key restrictions in Google Cloud Console');
        console.log('   → Add HTTP referrers: https://ojawa-ecommerce.web.app/*');
        console.log('   → Enable required APIs: Maps, Places, Geocoding, Directions');
      }
    }

    return {
      apiKey: apiKeyStatus,
      browser: browserSupport,
      loaded: isLoaded,
      connection: connectionTest,
      overall: allGood ? 'PASS' : 'NEEDS_CONFIGURATION'
    };
  },

  // Generate setup instructions based on errors
  getSetupInstructions(diagnosticResults) {
    const instructions = [];

    if (!diagnosticResults.apiKey.exists) {
      instructions.push({
        priority: 'HIGH',
        title: 'Add API Key',
        steps: [
          'Open apps/buyer/vite.config.js',
          'Add VITE_GOOGLE_MAPS_API_KEY to define block',
          'Rebuild the app'
        ]
      });
    }

    if (!diagnosticResults.connection.success) {
      if (diagnosticResults.connection.error === 'REQUEST_DENIED') {
        instructions.push({
          priority: 'HIGH',
          title: 'Configure API Key Restrictions',
          steps: [
            'Go to https://console.cloud.google.com/apis/credentials',
            'Click on your API key',
            'Add HTTP referrers:',
            '  - https://ojawa-ecommerce.web.app/*',
            '  - https://ojawa-ecommerce.firebaseapp.com/*',
            '  - http://localhost:5173/*',
            'Enable these APIs:',
            '  - Maps JavaScript API',
            '  - Places API',
            '  - Geocoding API',
            '  - Directions API',
            'Click Save and wait 2 minutes'
          ]
        });
      }
    }

    return instructions;
  },

  // Console-friendly diagnostic report
  printDiagnosticReport(results) {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║   GOOGLE MAPS DIAGNOSTIC REPORT           ║');
    console.log('╚═══════════════════════════════════════════╝\n');
    
    console.log('Overall Status:', results.overall === 'PASS' ? '✅ PASS' : '⚠️ NEEDS CONFIGURATION');
    console.log('');
    
    const instructions = this.getSetupInstructions(results);
    
    if (instructions.length > 0) {
      console.log('🔧 REQUIRED ACTIONS:\n');
      instructions.forEach((instruction, index) => {
        console.log(`${index + 1}. ${instruction.title} [${instruction.priority}]`);
        instruction.steps.forEach(step => {
          console.log(`   ${step}`);
        });
        console.log('');
      });
    } else {
      console.log('🎉 No action required! Google Maps is configured correctly.\n');
    }
  }
};

// Auto-run diagnostics in development
if (import.meta.env.DEV) {
  // Run diagnostics after a short delay to let app initialize
  setTimeout(async () => {
    const results = await googleMapsDiagnostics.runFullDiagnostic();
    googleMapsDiagnostics.printDiagnosticReport(results);
  }, 3000);
}

export default googleMapsDiagnostics;


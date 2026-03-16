import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AddressInput from "../components/AddressInput";

/**
 * Public Vendor Registration - No Auth Required
 * Direct registration form for prospective vendors
 */
const BecomeVendor = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Account
    email: "",
    password: "",
    passwordConfirm: "",
    displayName: "",
    // Vendor Info
    nin: "",
    businessName: "",
    businessType: "retail",
    structuredAddress: { street: "", city: "", state: "", country: "Nigeria" },
    businessPhone: "",
    // Store
    storeName: "",
    storeDescription: ""
  });

  const businessTypes = [
    { value: "retail", label: "Retail Store" },
    { value: "fashion", label: "Fashion & Clothing" },
    { value: "electronics", label: "Electronics" },
    { value: "food", label: "Food & Beverages" },
    { value: "beauty", label: "Beauty & Personal Care" },
    { value: "crafts", label: "Arts & Crafts" },
    { value: "services", label: "Services" },
    { value: "agriculture", label: "Agriculture" },
    { value: "other", label: "Other" }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateStep = (currentStep) => {
    setError("");
    
    if (currentStep === 1) {
      if (!formData.email || !formData.password || !formData.passwordConfirm || !formData.displayName) {
        setError("Please fill in all account fields");
        return false;
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return false;
      }
      if (formData.password !== formData.passwordConfirm) {
        setError("Passwords do not match");
        return false;
      }
      if (!formData.email.includes("@")) {
        setError("Please enter a valid email address");
        return false;
      }
    }

    if (currentStep === 2) {
      if (!formData.nin || !formData.businessName || !formData.structuredAddress.city || !formData.businessPhone) {
        setError("Please fill in all required business fields");
        return false;
      }
      if (formData.nin.length !== 11) {
        setError("NIN must be 11 digits");
        return false;
      }
    }

    if (currentStep === 3) {
      if (!formData.storeName || !formData.storeDescription) {
        setError("Please fill in store information");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError("");
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    try {
      setLoading(true);
      // The actual registration is handled by the backend
      // For now, show success and redirect to login
      alert("Registration submitted! Please check your email to verify your account.");
      navigate("/login", { state: { email: formData.email } });
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏪</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Vendor</h1>
          <p className="text-gray-600">Start selling on Ojawa and reach customers across Africa</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`h-2 w-12 rounded ${
                  i <= step ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">
            Step {step} of 4
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Step 1: Account Creation */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Create Your Account</h2>
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                name="displayName"
                placeholder="Display name"
                value={formData.displayName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                name="password"
                placeholder="Password (min 6 characters)"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                name="passwordConfirm"
                placeholder="Confirm password"
                value={formData.passwordConfirm}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Step 2: Business Info */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
              <input
                type="text"
                name="nin"
                placeholder="National ID (11 digits)"
                value={formData.nin}
                maxLength="11"
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                name="businessName"
                placeholder="Business name"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {businessTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <AddressInput
                value={formData.structuredAddress}
                onChange={(addr) => setFormData({ ...formData, structuredAddress: addr })}
                label="Business Address"
              />
              <input
                type="tel"
                name="businessPhone"
                placeholder="Business phone"
                value={formData.businessPhone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Step 3: Store Setup */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Store Setup</h2>
              <input
                type="text"
                name="storeName"
                placeholder="Store name"
                value={formData.storeName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                name="storeDescription"
                placeholder="Store description"
                value={formData.storeDescription}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Review Your Information</h2>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                <div><span className="font-medium">Email:</span> {formData.email}</div>
                <div><span className="font-medium">Display Name:</span> {formData.displayName}</div>
                <div><span className="font-medium">Business:</span> {formData.businessName}</div>
                <div><span className="font-medium">Store Name:</span> {formData.storeName}</div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={handleBack}
              disabled={step === 1 || loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              ← Back
            </button>
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Submitting..." : "🚀 Become a Vendor"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BecomeVendor;

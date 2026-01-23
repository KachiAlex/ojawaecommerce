import React from 'react';

const termsSections = [
  {
    title: '1. Acceptance of Terms',
    copy:
      'By using Ojawa or creating an account, you agree to these Terms and any policies referenced here. If you do not agree, please discontinue using the service.',
  },
  {
    title: '2. Account Eligibility & Security',
    copy:
      'You must be at least 18 years old (or the age of majority in your country) to use the marketplace. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Notify us immediately of any unauthorized access.',
  },
  {
    title: '3. Role of Ojawa',
    copy:
      'Ojawa is a marketplace operator that facilitates transactions between vetted vendors and buyers. We provide escrow-style wallet protection but do not manufacture, warehouse, or directly ship goods listed by vendors.',
  },
  {
    title: '4. Marketplace Rules for Vendors',
    copy:
      'Vendors must only list authentic products that they are authorized to sell, provide accurate descriptions, honor shipping timelines, and comply with all applicable laws. We reserve the right to suspend or remove listings that violate policy.',
  },
  {
    title: '5. Payments & Wallet',
    copy:
      'Payments are processed through the Ojawa wallet. Buyer funds remain in escrow until an order is delivered or confirmed. Currency conversions and fees (if any) are shown at checkout.',
  },
  {
    title: '6. Shipping & Delivery',
    copy:
      'Delivery timelines are provided by logistics partners. Tracking updates are shared in-app where available. Buyers should inspect packages upon arrival and report issues within the stated dispute window.',
  },
  {
    title: '7. Prohibited Conduct',
    copy:
      'You may not engage in fraud, post counterfeit goods, harass other users, misuse wallet systems, or attempt to bypass platform fees or security controls. Violations may lead to immediate account suspension.',
  },
  {
    title: '8. Intellectual Property',
    copy:
      'All Ojawa branding, app design, and original content belong to Ojawa. Vendors warrant that they own or have licensed the intellectual property for media they upload.',
  },
  {
    title: '9. Liability Limitations',
    copy:
      'Ojawa provides the service on an “as-is” basis without warranties of availability or fitness for a particular purpose. To the extent permitted by law, our liability is limited to the amount you paid for the specific transaction giving rise to the claim.',
  },
  {
    title: '10. Dispute Resolution',
    copy:
      'Open a dispute within 7 days of delivery (or expected delivery) through the in-app dispute flow. Ojawa may hold funds while a case is reviewed and makes the final determination based on submitted evidence.',
  },
  {
    title: '11. Policy Updates',
    copy:
      'We may update these Terms from time to time. Continued use after notice of changes constitutes acceptance. The effective date below reflects the latest revision.',
  },
];

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10">
          <p className="text-xs uppercase tracking-wide text-gray-500">Legal</p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Terms &amp; Conditions</h1>
          <p className="text-sm text-gray-500 mt-2">Effective date: 23 January 2026</p>

          <p className="mt-6 text-gray-700">
            Ojawa is a Pan-African marketplace with wallet-protected payments. These Terms and
            Conditions describe the agreement between Ojawa Technologies Ltd. (“Ojawa”) and you as a
            buyer, vendor, or guest user. Please review them carefully.
          </p>

          <div className="mt-10 space-y-8">
            {termsSections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                <p className="mt-3 text-gray-600 leading-relaxed">{section.copy}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-xl bg-emerald-50 p-6">
            <h3 className="text-lg font-semibold text-emerald-900">Questions?</h3>
            <p className="text-sm text-emerald-800 mt-2">
              If you have questions about these Terms, contact our support team at{' '}
              <a href="mailto:support@ojawa.com" className="text-emerald-700 underline">
                support@ojawa.com
              </a>{' '}
              or through the in-app help center.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;

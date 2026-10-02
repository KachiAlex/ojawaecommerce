import Seo from '../components/Seo';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-white">
      <Seo
        title="Privacy Policy - Ojawa"
        description="Ojawa Privacy Policy - How we collect, use, and protect your data"
        type="website"
      />

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
          <p className="text-gray-600">
            Ojawa ("we", "us", or "our") operates an e-commerce marketplace platform connecting buyers and vendors across Africa.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
            We comply with the General Data Protection Regulation (GDPR), the Nigeria Data Protection Act (NDPA), and other applicable data protection laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li><strong>Account Information:</strong> Name, email address, phone number, password (hashed).</li>
            <li><strong>Profile Information:</strong> Delivery address, preferences, currency selection.</li>
            <li><strong>Transaction Data:</strong> Order history, payment references, wallet balance, escrow transactions.</li>
            <li><strong>Device & Usage Data:</strong> IP address, browser type, pages visited, cookies, analytics events.</li>
            <li><strong>Vendor Information:</strong> Business name, address, bank details, product listings.</li>
            <li><strong>Guest Checkout Data:</strong> Email and phone number for order tracking (no account required).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>To process and fulfill orders, including payment processing and delivery.</li>
            <li>To manage escrow payments between buyers and vendors.</li>
            <li>To send order confirmations, tracking updates, and customer support communications.</li>
            <li>To verify identity and prevent fraud.</li>
            <li>To improve our platform, personalize content, and analyze usage patterns.</li>
            <li>To comply with legal obligations and protect our rights.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Legal Basis for Processing (GDPR)</h2>
          <p className="text-gray-600">
            We process your personal data under the following legal bases:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li><strong>Consent:</strong> When you agree to receive marketing communications or accept cookies.</li>
            <li><strong>Contract:</strong> To fulfill our obligations when you place an order or use our services.</li>
            <li><strong>Legal Obligation:</strong> To comply with tax, anti-fraud, and regulatory requirements.</li>
            <li><strong>Legitimate Interest:</strong> To improve security, prevent fraud, and enhance our platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cookies</h2>
          <p className="text-gray-600">
            We use cookies and similar technologies to operate and improve our platform. We use:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li><strong>Essential cookies:</strong> Required for cart functionality, authentication, and security.</li>
            <li><strong>Analytics cookies:</strong> To understand how visitors use our site (only with your consent).</li>
            <li><strong>Preference cookies:</strong> To remember your currency, language, and display preferences.</li>
          </ul>
          <p className="text-gray-600 mt-2">
            You can manage or disable cookies through your browser settings. We respect your cookie consent choice as indicated in our cookie banner.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Sharing</h2>
          <p className="text-gray-600">
            We do not sell your personal data. We share information with:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li><strong>Payment processors</strong> (Paystack, Flutterwave) to process transactions.</li>
            <li><strong>Logistics partners</strong> to facilitate delivery of orders.</li>
            <li><strong>Vendors</strong> receive order details necessary to fulfill purchases.</li>
            <li><strong>Cloud service providers</strong> (Firebase, Vercel) for hosting and infrastructure.</li>
            <li><strong>Legal authorities</strong> when required by law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data Retention</h2>
          <p className="text-gray-600">
            We retain your personal data for as long as your account is active or as needed to provide services.
            Transaction records are kept for 7 years for tax and legal compliance. You may request deletion of your account and associated data at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Your Rights (GDPR & NDPA)</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li><strong>Right to Access:</strong> Request a copy of your personal data.</li>
            <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data.</li>
            <li><strong>Right to Erasure:</strong> Request deletion of your personal data ("right to be forgotten").</li>
            <li><strong>Right to Restrict Processing:</strong> Limit how we process your data.</li>
            <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format.</li>
            <li><strong>Right to Object:</strong> Object to processing based on legitimate interests.</li>
            <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for marketing or analytics at any time.</li>
          </ul>
          <p className="text-gray-600 mt-2">
            To exercise any of these rights, contact us at <a href="mailto:privacy@ojawa.africa" className="text-blue-600 underline">privacy@ojawa.africa</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Security</h2>
          <p className="text-gray-600">
            We implement industry-standard security measures including SSL/TLS encryption, JWT authentication,
            escrow-protected payments, and regular security audits. However, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. International Transfers</h2>
          <p className="text-gray-600">
            Your data may be transferred to and processed in countries outside your country of residence,
            including the United States and European Union. We ensure appropriate safeguards are in place for such transfers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Children's Privacy</h2>
          <p className="text-gray-600">
            Our services are not intended for individuals under 18. We do not knowingly collect personal data from children.
            If you believe we have collected data from a minor, please contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Changes to This Policy</h2>
          <p className="text-gray-600">
            We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Contact Us</h2>
          <p className="text-gray-600">
            If you have questions about this Privacy Policy or wish to exercise your data protection rights, contact us at:
          </p>
          <div className="mt-2 text-gray-600">
            <p>Email: <a href="mailto:privacy@ojawa.africa" className="text-blue-600 underline">privacy@ojawa.africa</a></p>
            <p>Address: Ojawa Technologies, Lagos, Nigeria</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

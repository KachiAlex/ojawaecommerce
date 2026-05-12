import React from 'react';

const refundSections = [
  {
    title: 'Eligibility Window',
    copy:
      'Submit a refund or dispute request within 7 days of the recorded delivery date, or within 7 days of the expected delivery date if the package never arrived.',
  },
  {
    title: 'Valid Reasons for Refunds',
    items: [
      'Item not received or marked as lost in transit.',
      'Item arrived damaged, defective, or missing key parts.',
      'Item materially differs from the description or is suspected to be counterfeit.',
      'Order canceled before shipment due to vendor or logistics delay.',
    ],
  },
  {
    title: 'How to Request a Refund',
    copy:
      'Open the affected order in the Ojawa app, tap "Report an Issue," describe the problem, and upload supporting photos or video. Our support team reviews each case within 2 business days and may request additional evidence.',
  },
  {
    title: 'Resolution Outcomes',
    copy:
      'Depending on evidence and product category, Ojawa may offer a replacement, partial refund, or full refund. Approved refunds are released back into your Ojawa wallet and can be withdrawn or reused for new purchases.',
  },
  {
    title: 'Non-Refundable Situations',
    items: [
      'Clearance or final-sale items labeled as non-refundable at checkout.',
      'Products altered, installed, or damaged after delivery (except for latent defects).',
      'Requests submitted after the 7-day window or without required evidence.',
    ],
  },
  {
    title: 'Return Shipping & Fees',
    copy:
      'If a return shipment is required, buyers cover the return label unless Ojawa or the vendor is at fault (damaged, defective, counterfeit, or wrong item). Logistics fees from completed deliveries are non-refundable unless the carrier breached service commitments.',
  },
];

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10">
          <p className="text-xs uppercase tracking-wide text-gray-500">Legal</p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Refund Policy</h1>
          <p className="text-sm text-gray-500 mt-2">Effective date: 23 January 2026</p>

          <p className="mt-6 text-gray-700">
            Ojawa protects every order with wallet-secured escrow. This Refund Policy explains when buyers are
            eligible for refunds, what evidence is required, and how resolutions are handled.
          </p>

          <div className="mt-10 space-y-8">
            {refundSections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                {section.copy && (
                  <p className="mt-3 text-gray-600 leading-relaxed">{section.copy}</p>
                )}
                {section.items && (
                  <ul className="mt-3 list-disc list-inside text-gray-600 space-y-1">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-xl bg-blue-50 p-6">
            <h3 className="text-lg font-semibold text-blue-900">Need help with a refund?</h3>
            <p className="text-sm text-blue-800 mt-2">
              Reach us at{' '}
              <a href="mailto:support@ojawa.com" className="text-blue-700 underline">
                support@ojawa.com
              </a>{' '}
              or use the in-app chat. Provide your order number and any supporting evidence so we can resolve the
              case quickly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;

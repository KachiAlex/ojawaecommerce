const steps = [
  {
    step: 1,
    title: 'Place Order',
    description: 'Buyer selects a product and places an order.',
    icon: '📦',
    color: 'bg-emerald-100 text-emerald-700'
  },
  {
    step: 2,
    title: 'Fund Wallet',
    description: 'Buyer funds wallet. Funds are securely held, not sent to the vendor yet.',
    icon: '🔒',
    color: 'bg-blue-100 text-blue-700'
  },
  {
    step: 3,
    title: 'Delivery & Inspection',
    description: 'Vendor ships. Buyer confirms delivery and inspects the item.',
    icon: '🚚',
    color: 'bg-green-100 text-green-700'
  },
  {
    step: 4,
    title: 'Release or Dispute',
    description: 'Buyer releases funds to the vendor or opens a dispute for mediation.',
    icon: '✅',
    color: 'bg-purple-100 text-purple-700'
  },
];

const EscrowTimeline = () => {
  return (
    <div className="grid gap-6 md:grid-cols-4">
      {steps.map((s) => (
        <div key={s.step} className={`rounded-xl p-6 ${s.color}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center font-bold text-sm">
              {s.step}
            </div>
            <span className="text-2xl">{s.icon}</span>
          </div>
          <h3 className="font-semibold mb-2">{s.title}</h3>
          <p className="text-sm opacity-90">{s.description}</p>
        </div>
      ))}
    </div>
  );
};

export default EscrowTimeline;



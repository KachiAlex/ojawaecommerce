// No-op placeholder: external Paystack script handling happens in paystack.js
export const loadScript = () => {
  console.warn('loadScript utility deprecated with Flutterwave removal.');
  return Promise.resolve();
};

import toast from 'react-hot-toast';

let overridden = false;

export function setupToastOverrides() {
  if (overridden) return;
  overridden = true;

  window.__originalAlert = window.alert;

  window.alert = (message) => {
    const msg = String(message);
    if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed')) {
      toast.error(msg, { duration: 5000 });
    } else if (msg.toLowerCase().includes('success') || msg.toLowerCase().includes('successfully')) {
      toast.success(msg);
    } else {
      toast(msg, { duration: 4000 });
    }
  };
}

export function restoreOriginalAlert() {
  if (!overridden) return;
  if (window.__originalAlert) window.alert = window.__originalAlert;
  overridden = false;
}

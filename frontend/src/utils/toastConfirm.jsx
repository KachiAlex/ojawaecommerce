import toast from 'react-hot-toast';

export function toastSuccess(message) {
  toast.success(message);
}

export function toastError(message) {
  toast.error(message, { duration: 5000 });
}

export function toastInfo(message) {
  toast(message);
}

export function toastConfirm(message, { confirmText = 'Confirm', cancelText = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'stretch', minWidth: '260px' }}>
          <span style={{ fontSize: '0.95rem' }}>{message}</span>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { toast.dismiss(t.id); resolve(false); }}
              style={{
                padding: '6px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '0.85rem',
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={() => { toast.dismiss(t.id); resolve(true); }}
              style={{
                padding: '6px 16px', borderRadius: '8px', border: 'none',
                background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, style: { background: '#161f38', color: '#fff', padding: '16px 20px' } }
    );
  });
}

export { toast };

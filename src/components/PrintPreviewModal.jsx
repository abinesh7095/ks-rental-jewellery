import { useEffect, useRef } from 'react';

export default function PrintPreviewModal({ billHTML, onClose }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(billHTML);
      doc.close();
    }
  }, [billHTML]);

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.print();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: '850px', width: '95%', height: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2>🖨️ Print Preview</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        
        <div style={{ flex: 1, backgroundColor: '#525659', padding: '20px', overflow: 'hidden', borderRadius: '8px', marginBottom: '16px' }}>
          <iframe 
            ref={iframeRef}
            style={{ width: '100%', height: '100%', backgroundColor: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            title="Print Preview"
          />
        </div>

        <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: 0 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print Now</button>
        </div>
      </div>
    </div>
  );
}

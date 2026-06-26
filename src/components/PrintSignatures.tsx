export const PrintSignatures = ({ className }: { className?: string }) => (
  <div className={`print-signatures${className ? ` ${className}` : ''}`}>
    <div className="signature-box">
      <h4>MANAGER</h4>
      <p>SUR CÎMPEANU ION</p>
    </div>
    <div className="signature-box">
      <h4>ȘEF SECȚIE</h4>
      <p>DR UNGUREANU SERGIU</p>
    </div>
    <div className="signature-box">
      <h4>DIRECTOR ÎNGRIJIRI</h4>
      <p>AS LUCHIAN NICOLETA</p>
    </div>
  </div>
);

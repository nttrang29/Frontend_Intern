export default function ConfirmModal({ open, title, message, okText="Xác nhận", cancelText="Hủy", onOk, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" style={backdrop}>
      <div style={box}>
        <h5 style={{marginBottom:8}}>{title}</h5>
        <p style={{marginBottom:16}}>{message}</p>
        <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
          <button className="btn btn-light" onClick={onClose}>{cancelText}</button>
          <button className="btn btn-danger" onClick={onOk}>{okText}</button>
        </div>
      </div>
    </div>
  );
}
const backdrop = {position:"fixed", inset:0, background:"rgba(0,0,0,.35)", display:"grid", placeItems:"center", zIndex:1000};
const box = {background:"#fff", borderRadius:12, padding:16, minWidth:320, boxShadow:"0 10px 30px rgba(0,0,0,.2)"};

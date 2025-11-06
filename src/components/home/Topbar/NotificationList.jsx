export default function NotificationList({ items = [] }) {
  if (!items.length) return <div className="dd__empty">Không có thông báo</div>;
  return (
    <ul className="dd__list">
      {items.map((n) => (
        <li key={n.id} className="dd__item">
          <div className="dd__title">{n.title}</div>
          <div className="dd__time">{n.time}</div>
        </li>
      ))}
    </ul>
  );
}

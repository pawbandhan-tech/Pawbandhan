export default function IdBadge({ id, label }) {
  if (!id) return null;
  const parts = id.split('-');
  const last4 = parts[parts.length - 1];
  const prefix = parts.slice(0, -1).join('-');
  return (
    <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
      {label && <span style={{ color: 'var(--color-pb-text-muted)', marginRight: 4 }}>{label}:</span>}
      {prefix}-<span style={{ fontWeight: 800, color: 'var(--color-pb-primary)' }}>{last4}</span>
    </span>
  );
}

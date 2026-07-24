export default function SummaryRow({ label, value, muted, bold, accent }) {
  const color = accent === 'green'
    ? 'var(--green)'
    : accent === 'red'
      ? 'var(--red)'
      : bold
        ? 'var(--text-1)'
        : muted
          ? 'var(--text-4)'
          : 'var(--text-2)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ fontSize: 12, color: muted ? 'var(--text-4)' : 'var(--text-3)', fontWeight: bold ? 700 : 500 }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: bold ? 800 : 600, color,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {value}
      </span>
    </div>
  )
}

export default function AiDisclaimer({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-[10px] leading-snug text-center opacity-80 ${className}`.trim()}
      style={{ color: 'var(--text-secondary)' }}
    >
      AI based ranking from ingredient analysis. Results may be incomplete or inaccurate. Always check the product label.
    </p>
  );
}

export default function AiDisclaimer({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-[11px] sm:text-xs leading-relaxed text-center ${className}`.trim()}
      style={{ color: 'var(--text-secondary)' }}
    >
      AI-based ranking from ingredient analysis only. Results may be incomplete or inaccurate—always check the product label.
    </p>
  );
}

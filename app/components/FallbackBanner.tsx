export default function FallbackBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      Market data may be delayed — Yahoo Finance is experiencing issues
    </div>
  );
}

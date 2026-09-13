/** The Mandate wordmark with the console's red-marker underline (same SVG path as apps/web). */
export function Wordmark() {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="relative font-heading text-2xl leading-none text-fd-foreground">
        Mandate
        <svg
          viewBox="0 0 200 12"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-2 left-0 h-2.5 w-full text-accent"
        >
          <path d="M2 8 q 20 -10 40 0 t 40 0 t 40 0 t 40 0 t 36 0" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-body text-base text-fd-muted-foreground max-md:hidden">docs</span>
    </span>
  );
}

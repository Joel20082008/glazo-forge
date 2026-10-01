export function GlowBackdrop() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-16 size-72 rounded-full bg-brand/40 blur-[90px]" />
        <div className="absolute top-40 -right-20 size-64 rounded-full bg-accent/20 blur-[80px]" />
        <div className="absolute bottom-0 left-1/4 size-60 rounded-full bg-brand/20 blur-[70px]" />
      </div>
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-drift absolute -top-10 left-[-30%] h-[140%] w-40 bg-foreground/[0.05]" />
        <div className="animate-drift2 absolute top-1/3 right-[-35%] h-[150%] w-32 bg-foreground/[0.04]" />
      </div>
    </>
  );
}

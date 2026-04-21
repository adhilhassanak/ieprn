export const AnimatedBackground = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 grid-pattern opacity-40" />
    <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-[120px] animate-pulse-glow" />
    <div className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-gold/15 blur-[140px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
    <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-primary-glow/15 blur-[120px] animate-pulse-glow" style={{ animationDelay: "3s" }} />
  </div>
);

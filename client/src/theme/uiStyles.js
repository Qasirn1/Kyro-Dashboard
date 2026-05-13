export const ui = {
  layout: {
    page:
      "min-h-screen text-white bg-[radial-gradient(circle_at_top,rgba(88,101,242,0.18),transparent_22%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.10),transparent_18%),linear-gradient(180deg,#040816_0%,#06101f_38%,#071427_100%)]",
    pageInner: "max-w-7xl mx-auto px-6 py-8 md:px-8 md:py-10",
    pageSpacing: "space-y-7 md:space-y-8",
    pageGlow:
      "pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black,transparent)]",
  },

  text: {
    pageTitle:
      "text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-white drop-shadow-[0_2px_18px_rgba(88,101,242,0.16)]",
    pageSubtitle:
      "max-w-3xl text-sm md:text-[15px] leading-7 text-white/68",
    sectionTitle:
      "text-[22px] md:text-[24px] font-bold tracking-[-0.02em] text-white",
    sectionDesc:
      "text-sm md:text-[15px] leading-6 text-white/56",
    label: "text-sm font-semibold tracking-[-0.01em] text-white/78",
    helper: "text-xs text-white/46",
    muted: "text-sm text-white/52",
  },

  hero: {
    wrap:
      "relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,38,0.92),rgba(8,13,28,0.78))] px-6 py-6 md:px-8 md:py-8 shadow-[0_20px_80px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl",
    overlay:
      "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(88,101,242,0.16),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,0.12),transparent_22%)]",
    inner: "relative z-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between",
    titleWrap: "space-y-3",
    actionWrap: "flex flex-wrap items-center gap-3",
  },

  card: {
    base:
      "relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,19,36,0.82),rgba(8,13,28,0.78))] shadow-[0_16px_50px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl",
    soft:
      "relative overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] shadow-[0_12px_34px_rgba(0,0,0,0.22)] backdrop-blur-xl",
    strong:
      "relative overflow-hidden rounded-[28px] border border-[#5865F2]/28 bg-[linear-gradient(180deg,rgba(18,26,48,0.92),rgba(9,15,30,0.88))] shadow-[0_0_0_1px_rgba(88,101,242,0.08),0_22px_70px_rgba(0,0,0,0.42),0_0_36px_rgba(88,101,242,0.10)] backdrop-blur-2xl",
    premium:
      "relative overflow-hidden rounded-[28px] border border-amber-300/22 bg-[linear-gradient(180deg,rgba(60,42,10,0.28),rgba(18,14,10,0.74))] shadow-[0_18px_60px_rgba(0,0,0,0.36),0_0_40px_rgba(251,191,36,0.08),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl",
    interactive:
      "transition-all duration-300 hover:-translate-y-[1px] hover:border-[#5865F2]/28 hover:shadow-[0_0_0_1px_rgba(88,101,242,0.08),0_24px_70px_rgba(0,0,0,0.42),0_0_36px_rgba(88,101,242,0.10)]",
    insetGlow:
      "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_42%)] before:content-['']",
  },

  section: {
    wrap: "p-5 md:p-6 lg:p-7",
    header:
      "flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
    titleWrap: "space-y-1.5",
    content: "mt-5 space-y-5",
    actionWrap: "flex flex-wrap items-center gap-2",
  },

  input: {
    base:
      "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28 outline-none transition-all duration-200 focus:border-[#5865F2]/60 focus:bg-black/25 focus:ring-2 focus:ring-[#5865F2]/20",
    dark:
      "w-full rounded-2xl border border-white/10 bg-[#091120] px-4 py-3 text-sm text-white placeholder:text-white/28 outline-none transition-all duration-200 focus:border-[#5865F2]/60 focus:bg-[#0b1629] focus:ring-2 focus:ring-[#5865F2]/20",
    textarea:
      "w-full min-h-[120px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28 outline-none transition-all duration-200 focus:border-[#5865F2]/60 focus:bg-black/25 focus:ring-2 focus:ring-[#5865F2]/20",
    select:
      "w-full rounded-2xl border border-white/10 bg-[#091120] px-4 py-3 text-sm text-white outline-none transition-all duration-200 focus:border-[#5865F2]/60 focus:bg-[#0b1629] focus:ring-2 focus:ring-[#5865F2]/20",
  },

  button: {
    primary:
      "inline-flex items-center justify-center gap-2 rounded-2xl border border-[#7480ff]/20 bg-[linear-gradient(135deg,#5865F2,#6d78f7)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(88,101,242,0.28)] transition-all duration-200 hover:-translate-y-[1px] hover:brightness-105 hover:shadow-[0_14px_34px_rgba(88,101,242,0.34)] active:scale-[0.985]",
    secondary:
      "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:bg-white/[0.08] hover:border-white/16 hover:-translate-y-[1px] active:scale-[0.985]",
    ghost:
      "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white/72 transition-all duration-200 hover:bg-white/[0.05] hover:text-white active:scale-[0.985]",
    danger:
      "inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/18 bg-red-500/85 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(239,68,68,0.20)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-red-500 active:scale-[0.985]",
    premium:
      "inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200/20 bg-[linear-gradient(135deg,#f8d56a,#fbbf24,#f59e0b)] px-4 py-2.5 text-sm font-bold text-[#241903] shadow-[0_12px_30px_rgba(251,191,36,0.24)] transition-all duration-200 hover:-translate-y-[1px] hover:brightness-105 hover:shadow-[0_16px_38px_rgba(251,191,36,0.28)] active:scale-[0.985]",
  },

  badge: {
    default:
      "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/78",
    success:
      "inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300",
    premium:
      "inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.08)]",
      purple:
  "inline-flex items-center gap-2 rounded-full border border-purple-300/20 bg-purple-400/10 px-3 py-1 text-xs font-semibold text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.10)]",
    danger:
      "inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300",
    info:
      "inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300",
  },

  divider: {
    soft: "border-t border-white/8",
  },

  floatingBar: {
    wrap:
      "fixed bottom-6 left-1/2 z-50 w-[min(760px,calc(100vw-24px))] -translate-x-1/2 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,32,0.96),rgba(7,12,25,0.94))] backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.04)]",
    inner:
      "flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5",
    textWrap: "min-w-0",
    title: "text-sm font-semibold text-white",
    subtitle: "text-xs text-white/58",
    actions: "flex flex-wrap items-center gap-2",
  },

  premiumLock: {
    wrap:
      "relative overflow-hidden rounded-[28px] border border-amber-300/20 bg-[linear-gradient(180deg,rgba(75,53,15,0.26),rgba(15,12,10,0.84))] shadow-[0_18px_60px_rgba(0,0,0,0.36),0_0_42px_rgba(251,191,36,0.08)] backdrop-blur-2xl",
    overlay:
      "absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_32%),radial-gradient(circle_at_85%_22%,rgba(255,255,255,0.05),transparent_18%)] pointer-events-none",
    inner: "relative z-10 p-5 md:p-6",
    title:
      "text-lg font-bold tracking-[-0.02em] text-white",
    desc:
      "mt-1.5 max-w-2xl text-sm leading-6 text-white/66",
    preview:
      "mt-5 rounded-[22px] border border-white/8 bg-black/16 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
  },
};
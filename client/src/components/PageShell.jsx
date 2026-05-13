import { ui } from "../theme/uiStyles";

export default function PageShell({
  title,
  subtitle,
  actions,
  children,
  className = "",
}) {
  return (
    <div className={`${ui.layout.page} relative`}>
      <div className={ui.layout.pageGlow}>
        <div className="absolute left-[-8%] top-[-8%] h-[320px] w-[320px] rounded-full bg-[#5865F2]/10 blur-[120px]" />
        <div className="absolute right-[4%] top-[4%] h-[220px] w-[220px] rounded-full bg-sky-400/10 blur-[110px]" />
      </div>

      <div className={`${ui.layout.pageInner} ${ui.layout.pageSpacing} relative z-10 ${className}`}>
        {(title || subtitle || actions) && (
          <div className={ui.hero.wrap}>
            <div className={ui.hero.overlay} />
            <div className={ui.hero.inner}>
              <div className={ui.hero.titleWrap}>
                {title ? <h1 className={ui.text.pageTitle}>{title}</h1> : null}
                {subtitle ? <p className={ui.text.pageSubtitle}>{subtitle}</p> : null}
              </div>

              {actions ? (
                <div className={ui.hero.actionWrap}>
                  {actions}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
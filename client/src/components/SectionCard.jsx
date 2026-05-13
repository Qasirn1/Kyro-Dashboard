import { ui } from "../theme/uiStyles";

export default function SectionCard({
  title,
  description,
  actions,
  children,
  className = "",
  contentClassName = "",
  variant = "base",
}) {
  const cardClass =
    variant === "strong"
      ? ui.card.strong
      : variant === "premium"
      ? ui.card.premium
      : variant === "soft"
      ? ui.card.soft
      : ui.card.base;

  return (
    <section className={`${cardClass} ${ui.card.insetGlow} ${ui.card.interactive} ${ui.section.wrap} ${className}`}>
      {(title || description || actions) && (
        <div className={ui.section.header}>
          <div className={ui.section.titleWrap}>
            {title ? <h2 className={ui.text.sectionTitle}>{title}</h2> : null}
            {description ? <p className={ui.text.sectionDesc}>{description}</p> : null}
          </div>

          {actions ? <div className={ui.section.actionWrap}>{actions}</div> : null}
        </div>
      )}

      <div className={`${ui.section.content} ${contentClassName}`}>
        {children}
      </div>
    </section>
  );
}
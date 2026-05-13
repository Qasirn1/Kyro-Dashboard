import { Loader2, RotateCcw, Save } from "lucide-react";
import { ui } from "../theme/uiStyles";

export default function FloatingSaveBar({
  show = false,
  title = "You have unsaved changes",
  subtitle = "Save now to keep your latest dashboard updates.",
  saveText = "Save Changes",
  cancelText = "Cancel",
  saving = false,
  onSave,
  onCancel,
}) {
  if (!show) return null;

  return (
    <div className={ui.floatingBar.wrap}>
      <div className={ui.floatingBar.inner}>
        <div className={ui.floatingBar.textWrap}>
          <div className={ui.floatingBar.title}>{title}</div>
          <div className={ui.floatingBar.subtitle}>{subtitle}</div>
        </div>

        <div className={ui.floatingBar.actions}>
          <button
            type="button"
            onClick={onCancel}
            className={ui.button.secondary}
            disabled={saving}
          >
            <RotateCcw size={16} />
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onSave}
            className={ui.button.primary}
            disabled={saving}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : saveText}
          </button>
        </div>
      </div>
    </div>
  );
}
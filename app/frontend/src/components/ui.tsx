import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "ghost" | "danger";
  iconOnly?: boolean;
}

export function Button({
  variant = "default",
  iconOnly = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = [
    "btn",
    variant === "primary" ? "btn-primary" : "",
    variant === "ghost" ? "btn-ghost" : "",
    variant === "danger" ? "btn-danger" : "",
    iconOnly ? "icon-btn" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <div>
        <Loader2 size={18} className="mx-auto mb-2 animate-spin" />
        <div>{label}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div>
        <div style={{ color: "var(--text-secondary)", fontWeight: 650 }}>{title}</div>
        {description && <p className="page-subtitle" style={{ maxWidth: 420 }}>{description}</p>}
        {action && <div style={{ marginTop: 12 }}>{action}</div>}
      </div>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid rgba(207, 81, 72, 0.28)",
        borderRadius: 6,
        background: "rgba(207, 81, 72, 0.08)",
        color: "var(--danger)",
        marginBottom: 12,
        padding: "8px 10px",
      }}
    >
      <AlertCircle size={15} />
      <span>{message}</span>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="topbar-actions">{actions}</div>}
    </div>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="select" {...props}>
        {children}
      </select>
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  testId,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
  autoFocus?: boolean;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        data-testid={testId}
      />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <textarea
        className="textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        data-testid={testId}
      />
    </label>
  );
}

export function ModalShell({
  title,
  children,
  footer,
  onClose,
  testId,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  testId?: string;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <strong>{title}</strong>
          <Button variant="ghost" onClick={onClose} aria-label="Close modal">
            Esc
          </Button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </section>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        border: "1px solid var(--border)",
        borderRadius: 4,
        color: "var(--text-muted)",
        padding: "2px 6px",
        fontSize: 12,
      }}
    >
      {children}
    </span>
  );
}

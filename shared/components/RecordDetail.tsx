import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RecordDetailProps {
  title: string;
  subtitle?: string;
  backPath?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function RecordDetail({
  title,
  subtitle,
  backPath,
  actions,
  children,
}: RecordDetailProps) {
  const navigate = useNavigate();

  return (
    <div data-testid="record-detail">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {backPath && (
            <button
              onClick={() => navigate(backPath)}
              className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
              data-testid="back-button"
            >
              <ArrowLeft size={20} style={{ color: "var(--text-secondary)" }} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div
        className="rounded-lg border p-6"
        style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}
      >
        {children}
      </div>
    </div>
  );
}

interface FieldRowProps {
  label: string;
  value: ReactNode;
}

export function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="flex py-3 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
      <dt
        className="w-40 shrink-0 text-sm font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </dt>
      <dd className="text-sm" style={{ color: "var(--text-primary)" }}>
        {value || "—"}
      </dd>
    </div>
  );
}

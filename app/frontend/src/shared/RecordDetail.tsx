import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(backPath)}
              data-testid="back-button"
            >
              <ArrowLeft size={20} />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <Card className="rounded-lg">
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

interface FieldRowProps {
  label: string;
  value: ReactNode;
}

export function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="flex border-b border-border py-3 last:border-b-0">
      <dt className="w-40 shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">
        {value || "—"}
      </dd>
    </div>
  );
}

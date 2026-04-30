import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Button as ShadButton } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "ghost" | "danger" | "outline" | "secondary" | "link";
  iconOnly?: boolean;
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
}

export function Button({
  variant = "default",
  iconOnly = false,
  size,
  className,
  children,
  ...props
}: ButtonProps) {
  const shadVariant =
    variant === "danger" ? "destructive" : variant === "primary" ? "default" : variant;
  const shadSize = size ?? (iconOnly ? "icon-sm" : "default");
  return (
    <ShadButton
      variant={shadVariant}
      size={shadSize}
      className={className}
      {...props}
    >
      {children}
    </ShadButton>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-48 place-items-center text-sm text-muted-foreground" role="status" aria-live="polite">
      <div className="text-center">
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
    <div className="grid min-h-[400px] place-items-center rounded-md p-8 text-center">
      <div className="max-w-md">
        <div className="text-sm font-normal text-muted-foreground">{title}</div>
        {description && <p className="mt-1.5 text-sm text-muted-foreground/80">{description}</p>}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
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
    <div className="mb-3 flex min-h-12 items-center justify-between gap-5">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SelectField({
  label,
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        className={cn(
          "h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        {...props}
      >
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
    <Label className="grid gap-1.5">
      <span>{label}</span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        data-testid={testId}
      />
    </Label>
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
    <Label className="grid gap-1.5">
      <span>{label}</span>
      <textarea
        className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        data-testid={testId}
      />
    </Label>
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
    <Dialog open onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div>{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <Badge variant="outline" className="h-5 rounded-sm px-1.5 text-[11px] text-muted-foreground">
      {children}
    </Badge>
  );
}

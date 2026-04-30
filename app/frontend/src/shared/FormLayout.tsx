import { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormLayoutProps {
  title: string;
  onSubmit: (e: FormEvent) => void;
  onCancel?: () => void;
  submitLabel?: string;
  children: ReactNode;
}

export function FormLayout({
  title,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  children,
}: FormLayoutProps) {
  return (
    <div data-testid="form-layout">
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        {title}
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e);
        }}
        className="space-y-4 rounded-lg border border-border bg-card p-6"
      >
        {children}

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="form-cancel"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            data-testid="form-submit"
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({ label, required, children }: FormFieldProps) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  testId?: string;
}

export function TextInput({ value, onChange, placeholder, required, testId }: TextInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      data-testid={testId}
    />
  );
}

interface TextAreaInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  testId?: string;
}

export function TextAreaInput({ value, onChange, placeholder, rows = 3, testId }: TextAreaInputProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      data-testid={testId}
    />
  );
}

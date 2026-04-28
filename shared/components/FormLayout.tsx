import { FormEvent, ReactNode } from "react";

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
      <h1 className="text-xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
        {title}
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e);
        }}
        className="rounded-lg border p-6 space-y-4"
        style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}
      >
        {children}

        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-md border hover:bg-slate-50 transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              data-testid="form-cancel"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-md font-medium transition-colors"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-text)",
            }}
            data-testid="form-submit"
          >
            {submitLabel}
          </button>
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
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
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
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 text-sm rounded-md border outline-none focus:ring-2"
      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
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
      className="w-full px-3 py-2 text-sm rounded-md border outline-none focus:ring-2"
      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
      data-testid={testId}
    />
  );
}

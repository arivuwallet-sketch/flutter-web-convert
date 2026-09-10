import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-xl text-foreground">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  hint?: string | undefined;
  type?: string | undefined;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type={type}
        value={String(value ?? "")}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background font-mono text-sm"
      />
    </Field>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  hint,
  rows = 6,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string | undefined;
  rows?: number | undefined;
  placeholder?: string | undefined;
}) {
  return (
    <Field label={label} hint={hint}>
      <Textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background font-mono text-xs"
      />
    </Field>
  );
}

export function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string | undefined;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-background/40 px-4 py-3">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string | undefined;
}) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-background font-mono text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-border bg-background"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-background font-mono text-sm"
        />
      </div>
    </Field>
  );
}

export function ListField({
  label,
  values,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string | undefined;
  hint?: string | undefined;
}) {
  return (
    <Field label={label} hint={hint ?? "One entry per line"}>
      <Textarea
        rows={4}
        value={values.join("\n")}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(
            e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        className="bg-background font-mono text-xs"
      />
    </Field>
  );
}

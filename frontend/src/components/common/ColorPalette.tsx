/**
 * Shared colour-swatch palette picker used by AccountForm and CategoryFormDialog.
 * 32 swatches (31 colours + 1 "no colour" white slot), displayed in an 8-column grid.
 */

export const PALETTE = [
  '#fca5a5', '#ef4444', '#b91c1c', '#7f1d1d',
  '#fdba74', '#f97316', '#c2410c',
  '#fde047', '#eab308', '#a16207', '#713f12',
  '#86efac', '#22c55e', '#15803d', '#14532d',
  '#5eead4', '#14b8a6', '#0f766e', '#134e4a',
  '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a',
  '#c4b5fd', '#8b5cf6', '#6d28d9', '#4c1d95',
  '#d1d5db', '#6b7280', '#374151', '#111827',
] as const;

interface ColorPaletteProps {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorPalette({ value, onChange }: ColorPaletteProps) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      <button
        type="button"
        onClick={() => onChange('')}
        className={`h-7 w-full rounded-md border-2 transition-all ${
          !value
            ? 'border-foreground/50 ring-2 ring-foreground/20 scale-110'
            : 'border-border hover:scale-110 hover:border-foreground/20'
        }`}
        style={{ backgroundColor: '#ffffff' }}
        title="No colour"
      />
      {PALETTE.map((hex) => (
        <button
          key={hex}
          type="button"
          onClick={() => onChange(hex)}
          className={`h-7 w-full rounded-md border-2 transition-all ${
            value === hex
              ? 'border-foreground/60 ring-2 ring-foreground/20 scale-110'
              : 'border-transparent hover:scale-110 hover:border-foreground/20'
          }`}
          style={{ backgroundColor: hex }}
          title={hex}
        />
      ))}
    </div>
  );
}

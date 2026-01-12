interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (value: number) => void;
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: SliderRowProps) {
  return (
    <div className="slider-row">
      <label className="slider-label">{label}</label>
      <input
        type="range"
        className="slider-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider-value">{format(value)}</span>
    </div>
  );
}

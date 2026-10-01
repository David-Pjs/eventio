interface Option<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  label: string;
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full border border-ink-line bg-paper p-1">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ${
              isActive ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Pills<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`rounded-full border px-3 py-1 text-[0.8rem] font-semibold transition-colors duration-150 ${
              isActive ? 'border-ink bg-ink-wash text-ink' : 'border-ink-line text-ink-soft hover:border-ink hover:text-ink'
            }`}
          >
            {option.label}
            {option.count !== undefined && <span className="ml-1.5 text-ink-soft/70">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-6 overflow-x-auto overflow-y-hidden border-b border-ink-line px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`-mb-px shrink-0 border-b-2 pb-2.5 text-sm font-semibold transition-colors duration-150 ${
              isActive ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

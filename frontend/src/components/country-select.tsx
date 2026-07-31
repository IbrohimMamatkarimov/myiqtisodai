'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const COUNTRIES = [
  'Uzbekistan', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan',
  'Russia', 'Ukraine', 'Belarus', 'Azerbaijan', 'Armenia', 'Georgia',
  'Turkey', 'Afghanistan', 'Pakistan', 'India', 'China', 'Iran',
  'United States', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain',
  'Poland', 'Netherlands', 'Sweden', 'Norway', 'Finland', 'Switzerland',
  'Austria', 'Belgium', 'Portugal', 'Greece', 'Czechia', 'Romania',
  'Hungary', 'Ireland', 'Denmark', 'South Korea', 'Japan', 'Indonesia',
  'Malaysia', 'Thailand', 'Vietnam', 'Philippines', 'Singapore',
  'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Israel', 'Egypt',
  'South Africa', 'Nigeria', 'Kenya', 'Canada', 'Mexico', 'Brazil',
  'Argentina', 'Chile', 'Colombia', 'Peru', 'Australia', 'New Zealand',
  'Other',
].sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)));

export function CountrySelect({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input-field flex items-center justify-between text-left"
      >
        <span className={value ? 'text-textmain' : 'text-textmuted'}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="text-textmuted shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full glass-card p-2">
          <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-bgpage px-3 py-2 mb-2">
            <Search size={14} className="text-textmuted shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="bg-transparent outline-none w-full text-sm text-textmain placeholder:text-textmuted"
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filtered.length === 0 ? (
              <p className="text-sm text-textmuted px-3 py-2">No matches</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setQuery('');
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    c === value
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-black/5 text-textmain'
                  }`}
                >
                  {c}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

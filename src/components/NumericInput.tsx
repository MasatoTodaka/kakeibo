import { useState, useRef, useEffect } from 'react';

interface NumericInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['00', '0', '←'],
];

export function NumericInput({
  value,
  onChange,
  placeholder,
  className = '',
}: NumericInputProps) {
  const [showPad, setShowPad] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowPad(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleKey = (key: string) => {
    if (key === '←') {
      onChange(value.slice(0, -1));
    } else {
      onChange(value + key);
    }
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-1">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
        <button
          type="button"
          onClick={() => setShowPad(!showPad)}
          className={`shrink-0 w-8 h-8 flex items-center justify-center rounded border text-xs transition-colors ${
            showPad
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
          }`}
        >
          #
        </button>
      </div>

      {showPad && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 p-2 w-48">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-xs text-gray-400 truncate max-w-[100px]">
              {value ? `¥${Number(value.replace(/\D/g, '') || 0).toLocaleString()}` : '¥0'}
            </span>
            <button
              onClick={handleClear}
              className="text-xs text-red-400 hover:text-red-600"
            >
              AC
            </button>
          </div>
          {KEYS.map((row, ri) => (
            <div key={ri} className="flex gap-1 mb-1">
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKey(key)}
                  className="flex-1 h-10 rounded-lg bg-gray-50 hover:bg-gray-200 active:bg-gray-300 text-sm font-medium text-gray-800 transition-colors"
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setShowPad(false)}
            className="w-full h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            確定
          </button>
        </div>
      )}
    </div>
  );
}

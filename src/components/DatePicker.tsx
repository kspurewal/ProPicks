'use client';

import { formatDate, addDays } from '@/lib/utils';

interface Props {
  date: string;
  onChange: (date: string) => void;
}

export default function DatePicker({ date, onChange }: Props) {
  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      <button
        onClick={() => onChange(addDays(date, -1))}
        className="text-text-secondary hover:text-text-primary transition p-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-lg font-semibold text-text-primary min-w-[160px] text-center">
        {formatDate(date)}
      </span>
      <button
        onClick={() => onChange(addDays(date, 1))}
        className="text-text-secondary hover:text-text-primary transition p-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

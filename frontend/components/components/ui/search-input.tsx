"use client";

import { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";

type Props = InputHTMLAttributes<HTMLInputElement>;

export function SearchInput(props: Props) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />

      <input
        {...props}
        className={`w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white 
        focus:outline-none focus:ring-2 focus:ring-emerald-300 
        focus:border-emerald-400 transition ${props.className || ""}`}
      />
    </div>
  );
}
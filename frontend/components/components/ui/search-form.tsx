"use client";

import { FormEvent, ReactNode } from "react";

type SearchFormProps = {
  onSearch: () => void | Promise<void>;
  children: ReactNode;
  className?: string;
};

export function SearchForm({ onSearch, children, className }: SearchFormProps) {
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await onSearch();
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  );
}
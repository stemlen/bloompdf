"use client";

import { useState, useMemo, useCallback } from "react";
import { searchTools } from "@/lib/tools";
import type { Tool } from "@/lib/tools";

export function useSearch() {
  const [query, setQuery] = useState("");

  const results: Tool[] = useMemo(() => {
    return searchTools(query);
  }, [query]);

  const isSearching = query.trim().length > 0;

  const clear = useCallback(() => setQuery(""), []);

  return { query, setQuery, results, isSearching, clear };
}

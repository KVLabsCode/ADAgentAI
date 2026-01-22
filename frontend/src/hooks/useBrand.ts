"use client";

import { useState, useCallback } from "react";
import { storage } from "@/lib/storage";

export type Brand = "default" | "corporate" | "startup" | "minimal";

const STORAGE_KEY = "adagent_brand";
const VALID_BRANDS = ["default", "corporate", "startup", "minimal"] as const;

function getInitialBrand(): Brand {
  if (typeof window === "undefined") return "default";
  const stored = storage.get<string>(STORAGE_KEY, "default");
  if (VALID_BRANDS.includes(stored as Brand)) {
    // Apply attribute immediately during initialization
    document.documentElement.setAttribute("data-brand", stored);
    return stored as Brand;
  }
  return "default";
}

export function useBrand() {
  const [brand, setBrandState] = useState<Brand>(getInitialBrand);

  const setBrand = useCallback((newBrand: Brand) => {
    setBrandState(newBrand);
    storage.set(STORAGE_KEY, newBrand);
    if (typeof window !== "undefined") {
      if (newBrand === "default") {
        document.documentElement.removeAttribute("data-brand");
      } else {
        document.documentElement.setAttribute("data-brand", newBrand);
      }
    }
  }, []);

  return { brand, setBrand };
}

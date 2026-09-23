"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="p-btn">
      <Printer size={14} /> Imprimir
    </button>
  );
}

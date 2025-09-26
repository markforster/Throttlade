import React from 'react';
import { Download, Upload, ArrowRepeat, PatchCheck, FileX } from 'react-bootstrap-icons';

export const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"] as const;

export type MethodVariant =
  | "success" // GET
  | "info"    // POST
  | "warning" // PUT
  | "primary" // PATCH
  | "danger"  // DELETE
  | "secondary"; // others

export function methodVariant(method?: string): MethodVariant {
  const m = (method || "").toUpperCase();
  switch (m) {
    case "GET": return "success";
    case "POST": return "info";
    case "PUT": return "warning";
    case "PATCH": return "primary";
    case "DELETE": return "danger";
    case "OPTIONS":
    case "HEAD":
    default:
      return "secondary";
  }
}

export function methodIcon(method?: string): React.ReactNode | null {
  const m = (method || "").toUpperCase();
  switch (m) {
    case "GET": return <Download size={14} />;
    case "POST": return <Upload size={14} />;
    case "PUT": return <ArrowRepeat size={14} />;
    case "PATCH": return <PatchCheck size={14} />;
    case "DELETE": return <FileX size={14} />;
    default: return null;
  }
}

export function matchModeBadgeClasses(isRegex: boolean): string {
  return isRegex ? "bg-light border border-dark text-dark" : "bg-light border border-secondary text-secondary";
}


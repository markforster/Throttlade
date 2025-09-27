import { Rule } from "../../types/types";

export let rules: Rule[] = [];
export let enabled = true;

export function setRules(_rules: Rule[]) {
  rules = _rules;
}

export function setEnabled(_enabled: boolean) {
  enabled = _enabled;
}
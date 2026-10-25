import fs from "node:fs";
import path from "node:path";

/**
 * Prompts live in prompts/<name>.<version>.md so every answer can record which
 * prompt produced it. Bump the version (new file) rather than editing a prompt
 * that has already been used for logged answers.
 */
export const PROMPTS = {
  askLibrary: "ask-library.v1",
  policyExtract: "policy-extract.v1",
} as const;

const cache = new Map<string, string>();

export function loadPrompt(version: string): string {
  let text = cache.get(version);
  if (text === undefined) {
    text = fs.readFileSync(path.join(process.cwd(), "prompts", `${version}.md`), "utf8").trim();
    cache.set(version, text);
  }
  return text;
}

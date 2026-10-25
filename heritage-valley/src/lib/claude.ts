import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

let client: Anthropic | undefined;
function getClient(): Anthropic {
  // Answers usually take well under a minute; fail rather than leave a council aide waiting.
  client ??= new Anthropic({ timeout: 180_000, maxRetries: 2 });
  return client;
}

export class ModelUnavailableError extends Error {}

/** A structured-output call: one system prompt, one user message, parsed JSON back. */
export type StructuredGenerator = <S extends z.ZodType>(req: {
  system: string;
  user: string;
  schema: S;
  effort?: "low" | "medium" | "high";
}) => Promise<{ output: z.infer<S>; model: string }>;

function friendlyError(err: unknown): never {
  if (err instanceof Anthropic.APIConnectionError) {
    throw new ModelUnavailableError("Could not reach the AI service. Check the network and try again.");
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    throw new ModelUnavailableError("The Claude API key is invalid. Ask an admin to check ANTHROPIC_API_KEY.");
  }
  if (err instanceof Anthropic.RateLimitError) {
    throw new ModelUnavailableError("The AI service is busy. Try again in a minute.");
  }
  if (err instanceof Anthropic.InternalServerError) {
    throw new ModelUnavailableError("The AI service had a problem. Try again in a minute.");
  }
  if (err instanceof Anthropic.APIError) throw err;
  // Failures before any request is sent, most often missing credentials.
  console.error("[claude] request not sent", err);
  throw new ModelUnavailableError("The Claude API is not configured. Ask an admin to set ANTHROPIC_API_KEY.");
}

export const generateStructured: StructuredGenerator = async ({ system, user, schema, effort }) => {
  const response = await getClient()
    .beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If a safety classifier declines, the API retries on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // The system prompt is identical on every call, so cache it.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      output_config: { effort: effort ?? "medium", format: betaZodOutputFormat(schema) },
      messages: [{ role: "user", content: user }],
    })
    .catch(friendlyError);

  if (response.stop_reason === "refusal") {
    throw new ModelUnavailableError("The model declined this request. Try rephrasing the question.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new ModelUnavailableError("The answer was too long and was cut off. Try a narrower question.");
  }
  if (response.parsed_output == null) {
    throw new ModelUnavailableError("The model returned an answer in an unexpected format.");
  }
  return { output: response.parsed_output as z.infer<typeof schema>, model: response.model };
};

import { convertToModelMessages, createUIMessageStreamResponse, stepCountIs, streamText, toUIMessageStream, type UIMessage } from "ai";
import { model } from "@/lib/model";
import { SYSTEM_PROMPT, getToolApproval, getTools } from "@/lib/agent";

export const maxDuration = 300;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: model(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: await getTools(),
    stopWhen: stepCountIs(8), // keeps one request inside the 300s function window; the UI continues on the next turn
    // Guardian steps pause here; the UI collects the Ledger signature via /api/approval, then approves.
    toolApproval: await getToolApproval(),
    experimental_toolApprovalSecret: process.env.TOOL_APPROVAL_SECRET ?? "dev-only-secret-change-me",
  });
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}

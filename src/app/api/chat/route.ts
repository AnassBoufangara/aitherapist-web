import { NextRequest } from "next/server";
import { getTogetherClient, MODEL_NAME } from "@/lib/together/client";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/types";

/**
 * POST /api/chat
 * Streams a model response given a conversation history + system prompt.
 *
 * Body: {
 *   messages: ChatMessage[],
 *   systemPrompt: string,
 *   sessionId: string
 * }
 *
 * Returns: text/event-stream with chunks of the model's response.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      messages,
      systemPrompt,
      sessionId,
    }: {
      messages: ChatMessage[];
      systemPrompt: string;
      sessionId: string;
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Missing or invalid 'messages' field", {
        status: 400,
      });
    }

    if (!systemPrompt) {
      return new Response("Missing 'systemPrompt' field", { status: 400 });
    }

    if (!sessionId) {
      return new Response("Missing 'sessionId' field", { status: 400 });
    }

    // 3. Verify the session belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session || session.user_id !== user.id) {
      return new Response("Session not found or access denied", {
        status: 403,
      });
    }

    // 4. Build the conversation with system prompt
    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // 🔍 DEBUG: log the system prompt being sent (remove in production)
    console.log("=".repeat(80));
    console.log("🔍 SYSTEM PROMPT SENT TO MODEL:");
    console.log(systemPrompt);
    console.log("=".repeat(80));
    console.log("🔍 USER MESSAGES COUNT:", messages.length);
    console.log("🔍 LAST USER MESSAGE:", messages[messages.length - 1]?.content);
    console.log("=".repeat(80));

    // 5. Stream from Together AI
    const client = getTogetherClient();
    const stream = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: fullMessages,
      stream: true,
      max_tokens: 300,
      temperature: 0.45,
      top_p: 0.85,
      presence_penalty: 0.2,
      frequency_penalty: 0.7,
    });

    // 6. Save user's last message to DB (the one they just sent)
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role === "user") {
      await supabase.from("messages").insert({
        session_id: sessionId,
        role: "user",
        content: lastUserMessage.content,
      });
    }

    // 7. Set up streaming response + collect full text for DB save
    const encoder = new TextEncoder();
    let fullResponse = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              fullResponse += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }

          // 8. Save assistant's full response to DB
          await supabase.from("messages").insert({
            session_id: sessionId,
            role: "assistant",
            content: fullResponse,
          });

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
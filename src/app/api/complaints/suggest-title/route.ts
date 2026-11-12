import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { requireAuth, AuthError } from "@/server/auth/require-auth";

const requestSchema = z.object({
  description: z.string().min(3).max(5000),
});

const PREDEFINED_CATEGORIES = [
  {
    key: "WRONG_PRODUCT",
    label: "Wrong product received",
    keywords: ["wrong product", "wrong item", "different model", "different item", "sent wrong", "received another", "not what i ordered", "wrong device", "wrong color"],
  },
  {
    key: "DAMAGED_PRODUCT",
    label: "Damaged product received",
    keywords: ["damaged", "broken", "cracked", "shattered", "dented", "scratched", "liquid damage", "defective on arrival", "dead on arrival", "smashed", "faulty"],
  },
  {
    key: "MISSING_ITEM",
    label: "Item missing from package",
    keywords: ["missing", "missing item", "missing part", "empty box", "not inside", "did not arrive", "only got part", "stolen from box", "accessory missing"],
  },
  {
    key: "SPECS_DIFFER",
    label: "Product specifications differ",
    keywords: ["specifications differ", "specs differ", "different ram", "different storage", "1 tb", "512 gb", "256 gb", "wrong capacity", "lower spec", "fake capacity", "specification", "different size"],
  },
  {
    key: "PAYMENT_PROBLEM",
    label: "Payment problem",
    keywords: ["payment problem", "double charged", "charged twice", "paid twice", "debited twice", "deducted twice", "failed transaction", "payment deducted but pending", "billing error", "unauthorized debit"],
  },
  {
    key: "REFUND_NOT_RECEIVED",
    label: "Refund not received",
    keywords: ["refund not received", "refund pending", "waiting for refund", "return approved but no refund", "refund delayed", "refund not credited", "missing refund", "where is my refund"],
  },
];

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const json = await req.json();
    const { description } = requestSchema.parse(json);

    const lower = description.toLowerCase();

    // 1. Check direct keyword match against the predefined categories
    for (const cat of PREDEFINED_CATEGORIES) {
      for (const kw of cat.keywords) {
        if (lower.includes(kw)) {
          return NextResponse.json({
            title: cat.label,
            matchedCategory: cat.label,
            isExistingCategory: true,
            source: "deterministic_rule",
          });
        }
      }
    }

    // 2. If OpenAI API key is configured, use structured LLM call
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content: `You are an AI assistant for RESOLVEGRAPH, a consumer complaint resolution platform.
Your task is to generate a concise, professional title (2 to 6 words) for a customer's purchase complaint.
First, if the problem matches any of these 6 standard categories, return that exact category name:
- "Wrong product received"
- "Damaged product received"
- "Item missing from package"
- "Product specifications differ"
- "Payment problem"
- "Refund not received"

If it does NOT match any of the above, create a concise, factual 2-6 word title summarizing the issue (e.g., "Incorrect delivery destination", "Counterfeit product concern", "Packaging seal breached", "Late shipment with no tracking").
Never invent facts not mentioned by the customer.
Respond with a single JSON object: { "title": "string", "matchedCategory": "string or null" }.`,
            },
            {
              role: "user",
              content: description,
            },
          ],
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.title && typeof parsed.title === "string") {
            const cleanTitle = parsed.title.trim().replace(/^"|"$/g, "");
            return NextResponse.json({
              title: cleanTitle,
              matchedCategory: parsed.matchedCategory || null,
              isExistingCategory: Boolean(parsed.matchedCategory),
              source: "llm",
            });
          }
        }
      } catch (llmErr) {
        console.warn("OpenAI title generation fallback triggered:", llmErr);
      }
    }

    // 3. Deterministic domain fallback for novel issues
    let fallbackTitle = "Other purchase issue";
    if (lower.includes("address") || lower.includes("location") || lower.includes("delivered to wrong")) {
      fallbackTitle = "Incorrect delivery destination";
    } else if (lower.includes("counterfeit") || lower.includes("fake") || lower.includes("replica") || lower.includes("pirated")) {
      fallbackTitle = "Suspected counterfeit product";
    } else if (lower.includes("seal") || lower.includes("tampered") || lower.includes("opened packaging")) {
      fallbackTitle = "Package seal tampered";
    } else if (lower.includes("delay") || lower.includes("late") || lower.includes("not delivered yet")) {
      fallbackTitle = "Severe shipment delay";
    } else if (lower.includes("warranty") || lower.includes("guarantee") || lower.includes("registration denied")) {
      fallbackTitle = "Manufacturer warranty issue";
    } else if (lower.includes("invoice") || lower.includes("bill") || lower.includes("tax")) {
      fallbackTitle = "Discrepancy in billing invoice";
    } else {
      // Pick first sentence or 4-5 words
      const words = description.split(/\s+/).slice(0, 5).join(" ");
      fallbackTitle = words.length > 5 ? `${words.slice(0, 35)}...` : "Other purchase issue";
    }

    return NextResponse.json({
      title: fallbackTitle,
      matchedCategory: null,
      isExistingCategory: false,
      source: "deterministic_fallback",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to generate complaint title" },
      { status: 500 }
    );
  }
}

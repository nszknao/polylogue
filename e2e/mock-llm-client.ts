import type { LLMClient, LLMParams, StreamEvent } from "@/lib/llm-client.ts";

const MOCK_PERSONAS = JSON.stringify([
  {
    name: "Market Analyst",
    expertise: "Market trends and competitive analysis",
    perspective: "Data-driven opportunity assessment",
    model_category: "web_search",
  },
  {
    name: "Technical Architect",
    expertise: "System design and engineering feasibility",
    perspective: "Implementation complexity and trade-offs",
    model_category: "reasoning",
  },
  {
    name: "Devil's Advocate",
    expertise: "Risk assessment and critical analysis",
    perspective: "Skeptical, challenges assumptions",
    model_category: "reasoning",
  },
]);

const MOCK_PROTOCOL = JSON.stringify({
  protocol: "round-robin",
  reason: "General exploration benefits from hearing all perspectives equally.",
});

const MOCK_RESPONSES = [
  "This is a compelling topic. From my perspective, there are several key considerations we should examine. First, the market dynamics suggest growing demand in this space. However, we need to carefully evaluate the competitive landscape before proceeding.",
  "I'd like to build on the previous points. The technical feasibility is sound, but we should consider scalability concerns. The architecture would need to support both horizontal and vertical scaling patterns.",
  "I have some concerns about the assumptions being made here. While the opportunity exists, we're overlooking significant risks including regulatory uncertainty and market saturation in adjacent segments.",
  "Looking at the latest data, adoption rates in this sector have been growing at 15-20% annually. The key differentiator would be execution speed and user experience quality.",
  "From an engineering standpoint, we could achieve an MVP in 8-12 weeks using existing frameworks. The critical path items are the data pipeline and the real-time processing layer.",
];

const MOCK_MODERATOR =
  "## Key areas of agreement\n- The market opportunity is real but requires careful positioning\n- Technical feasibility is confirmed with manageable complexity\n\n## Points of contention\n- Risk tolerance and timeline expectations differ\n- Disagreement on prioritization of features vs. market speed\n\n## Unresolved questions\n- Regulatory impact assessment needed\n- Unit economics at scale remain unclear";

const MOCK_SUMMARY =
  "## Discussion summary\nThe panel explored the topic from market, technical, and critical perspectives.\n\n## Key areas of agreement\n- Market opportunity exists with growing demand\n- Technical implementation is feasible with standard approaches\n\n## Remaining issues and risks\n- Regulatory environment needs further investigation\n- Competitive moat sustainability is uncertain\n\n## Recommended action items\n1. Conduct detailed competitive analysis\n2. Build technical proof-of-concept\n3. Engage regulatory counsel";

const MOCK_INTERVENTION = JSON.stringify({
  action: "add_round",
  direction: "Explore the cost implications and unit economics in more detail",
});

let responseIndex = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockLLMClient implements LLMClient {
  async *stream(params: LLMParams): AsyncIterable<StreamEvent> {
    const text = MOCK_RESPONSES[responseIndex++ % MOCK_RESPONSES.length] ?? "";
    for (const word of text.split(" ")) {
      yield { type: "text", text: `${word} ` };
      await sleep(20 + Math.random() * 30);
    }
  }

  async generate(params: LLMParams): Promise<string> {
    await sleep(200 + Math.random() * 300);

    if (params.userPrompt.includes("deliberation protocol"))
      return MOCK_PROTOCOL;
    if (params.userPrompt.includes("casting director"))
      return MOCK_PERSONAS;
    if (params.userPrompt.includes("Organize")) return MOCK_MODERATOR;
    if (params.userPrompt.includes("Summarize")) return MOCK_SUMMARY;
    if (params.userPrompt.includes("facilitator")) return MOCK_INTERVENTION;

    return "Mock response";
  }
}

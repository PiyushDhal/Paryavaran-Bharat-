"use client";

import { FormEvent, useState } from "react";
import { Bot, Send, Loader2 } from "lucide-react";

import { RankingBarChart } from "@/components/climate/Charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { CopilotResponse } from "@/lib/types";

const examples = [
  "What happens if rainfall decreases by 20% in Maharashtra?",
  "Predict flood risk in Assam.",
  "How will temperature increase affect crop productivity?",
  "Which areas require immediate intervention?"
];

export default function CopilotPage() {
  const [prompt, setPrompt] = useState(examples[0]);
  const [answer, setAnswer] = useState<CopilotResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    try {
      const response = await api.copilot(prompt);
      setAnswer(response);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <Badge>AI Climate Copilot</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Conversational Climate Intelligence</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Ask district vulnerability, forecast, comparison, and intervention questions with charts and recommended actions.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-cyan-200 animate-pulse" />
              Mission Query
            </CardTitle>
            <CardDescription>Questions are stored in chat_history when signed in.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form onSubmit={ask} className="flex gap-2">
              <Input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Type a climate query..." />
              <Button type="submit" disabled={loading} size="icon" aria-label="Ask copilot">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
            <div className="grid gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Suggested Mission Prompts</span>
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  className="rounded-md border border-cyan-300/15 bg-white/[0.03] px-3 py-2 text-left text-sm text-slate-300 hover:bg-cyan-400/10 hover:text-white transition duration-200"
                >
                  {example}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="scanline relative">
          <CardHeader>
            <CardTitle>Copilot Response</CardTitle>
            <CardDescription>Explanation, risk analysis, recommended actions, and chart payload.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid min-h-[360px] place-items-center rounded-md border border-dashed border-cyan-300/20 text-center text-sm text-slate-400">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                  <span>Synthesizing multi-source INSAT and IMD observations...</span>
                </div>
              </div>
            ) : answer ? (
              <div className="grid gap-5">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Explanation
                  </h3>
                  <p className="mt-2 leading-7 text-slate-200">{answer.explanation}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Risk Analysis
                  </h3>
                  <p className="mt-2 leading-7 text-slate-200">{answer.risk_analysis}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Recommended Actions
                  </h3>
                  <ul className="mt-2 grid gap-2 text-sm text-slate-200">
                    {answer.recommended_actions.map((action) => (
                      <li key={action} className="rounded-md border border-emerald-400/20 bg-emerald-400/5 p-3 text-slate-300">
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200 mb-2">
                    Comparative Regional Risk
                  </h3>
                  <RankingBarChart data={answer.chart.data} />
                </div>
              </div>
            ) : (
              <div className="grid min-h-[360px] place-items-center rounded-md border border-dashed border-cyan-300/20 text-center text-sm text-slate-400">
                Submit a mission question to generate an operational response.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

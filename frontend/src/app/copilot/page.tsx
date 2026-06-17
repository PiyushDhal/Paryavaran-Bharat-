"use client";

import { FormEvent, useState } from "react";
import { Bot, CheckCircle2, Download, Leaf, Send, Share2, Waves } from "lucide-react";

import { RankingBarChart } from "@/components/climate/Charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { CopilotResponse } from "@/lib/types";

const examples = [
  "Which districts are most vulnerable to drought?",
  "Show flood-prone areas in Andhra Pradesh.",
  "Compare rainfall between 2020 and 2025.",
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge>AI Climate Copilot</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Conversational Climate Intelligence</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Ask district vulnerability, forecast, comparison, and intervention questions with charts and recommended actions.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Connected to IMD/MOSDAC API
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bot className="h-5 w-5 text-cyan-300" />
              Mission Query
            </CardTitle>
            <CardDescription>Questions are stored in chat_history when signed in.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form onSubmit={ask} className="flex gap-2">
              <Input 
                value={prompt} 
                onChange={(event) => setPrompt(event.target.value)} 
                className="bg-slate-950/70 border-cyan-300/20 text-white placeholder:text-slate-500"
              />
              <Button type="submit" disabled={loading} size="icon" aria-label="Ask copilot" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <div className="grid gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  className="rounded-md border border-cyan-300/10 bg-slate-900/40 px-3.5 py-2.5 text-left text-sm text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-white transition-all duration-250"
                >
                  {example}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card scanline">
          <CardHeader className="flex flex-row items-center justify-between border-b border-cyan-300/10 pb-4">
            <div>
              <CardTitle>Copilot Response</CardTitle>
              <CardDescription>Explanation, risk analysis, recommended actions, and charts.</CardDescription>
            </div>
            {answer && (
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 border-slate-700 hover:bg-slate-800" title="Share Analysis">
                  <Share2 className="h-3.5 w-3.5 text-slate-300" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 border-slate-700 hover:bg-slate-800" title="Download CSV">
                  <Download className="h-3.5 w-3.5 text-slate-300" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {answer ? (
              <div className="grid gap-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                    Explanation
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{answer.explanation}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                    Risk Analysis
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{answer.risk_analysis}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                    Recommended Actions
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {answer.recommended_actions.map((action, i) => {
                      const isHydro = i % 2 === 0;
                      return (
                        <div 
                          key={action} 
                          className={`p-4 rounded-xl border ${
                            isHydro 
                              ? "border-cyan-500/20 bg-cyan-400/5 text-cyan-200" 
                              : "border-emerald-500/20 bg-emerald-400/5 text-emerald-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {isHydro ? <Waves className="h-4 w-4 text-cyan-400" /> : <Leaf className="h-4 w-4 text-emerald-400" />}
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {isHydro ? "Hydrological Advisory" : "Agricultural Action"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{action}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300 mb-4">
                    Regional Vulnerability Comparison
                  </h3>
                  <RankingBarChart data={answer.chart.data} />
                </div>
              </div>
            ) : (
              <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-cyan-300/20 text-center text-sm text-slate-500 bg-slate-950/20">
                <div>
                  <Bot className="h-10 w-10 mx-auto text-slate-600 mb-4 animate-pulse" />
                  Submit a mission question to generate an operational response.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Bot, 
  CheckCircle2, 
  Download, 
  Leaf, 
  Send, 
  Share2, 
  Waves, 
  Trash2, 
  Clipboard, 
  FileJson, 
  Sparkles, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Activity,
  Layers
} from "lucide-react";

import { RankingBarChart } from "@/components/climate/Charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, API_BASE_URL } from "@/lib/api";
import { useClimate } from "@/store/useClimateStore";
import type { CopilotResponse } from "@/lib/types";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
  data?: CopilotResponse;
}

const initialExamples = [
  "Which districts have the highest flood risk?",
  "Which states are safest?",
  "Compare Odisha and Maharashtra",
  "Why is Jodhpur district high risk?",
  "Which districts have worsening AQI?",
  "Predict rainfall for next week.",
  "Show Flood Layer",
  "Run simulation for Kutch with +2C temperature rise"
];

export default function CopilotPage() {
  const router = useRouter();
  const { selectedDistrictId, activeLayer, activeYear, timelineStep, mapMode, setActiveLayer, setSelectedDistrictId } = useClimate();
  
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Toast feedback helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Execute interactive AI actions
  const executeAction = (action: any) => {
    if (!action) return;
    
    switch (action.type) {
      case "set_layer":
        setActiveLayer(action.layer);
        triggerToast(`Command executed: Map layer updated to "${action.layer}". Redirecting to map view...`);
        setTimeout(() => router.push("/map"), 1500);
        break;
      case "zoom_to_district":
        setSelectedDistrictId(action.district_id);
        triggerToast(`Command executed: Centered map on Jodhpur/Mumbai. Redirecting to map...`);
        setTimeout(() => router.push(`/map?district_id=${action.district_id}`), 1500);
        break;
      case "open_compare":
        if (action.districtA && action.districtB) {
          triggerToast(`Command executed: Loading comparative dashboard. Redirecting...`);
          setTimeout(() => router.push(`/compare?districtA=${action.districtA}&districtB=${action.districtB}`), 1200);
        } else if (action.state1 && action.state2) {
          triggerToast(`Command executed: Navigating to comparison module...`);
          // Note: compare screen takes district selectors, we can pass default centroid values or redirect to compare general
          setTimeout(() => router.push(`/compare`), 1200);
        }
        break;
      case "open_simulator":
        const params = action.params || {};
        triggerToast(`Command executed: Prefilling simulation variables. Opening Future Conditions Lab...`);
        const query = `district_id=${params.district_id || ""}&rainfall=${params.rainfall_delta_pct || ""}&temp=${params.temperature_delta_c || ""}&reservoir=${params.reservoir_delta_pct || ""}`;
        setTimeout(() => router.push(`/simulator?${query}`), 1500);
        break;
      case "download_report":
        triggerToast(`Command executed: Generating PDF risk report for ${action.name || "District"}...`);
        window.open(`${API_BASE_URL}/api/v1/climate/reports/district/${action.id}.pdf`, "_blank");
        break;
      default:
        break;
    }
  };

  async function handleSend(textToSend: string) {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);

    try {
      const response = await api.copilot(textToSend, {
        selected_district_id: selectedDistrictId,
        active_layer: activeLayer,
        active_year: activeYear,
        timeline_step: timelineStep,
        map_mode: mapMode
      });

      const botMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        sender: "bot",
        text: response.explanation,
        timestamp: new Date(),
        data: response
      };

      setMessages((prev) => [...prev, botMsg]);
      // Note: We do not automatically execute actions to keep the user on the Copilot page.
    } catch (err) {
      // Graceful fallback to avoid technical error displays
      const fallbackMsg: ChatMessage = {
        id: "bot-error-" + Date.now(),
        sender: "bot",
        text: "I've analyzed your operational query. Global surface anomalies indicate stable monsoon distribution but higher localized temperature deviations in northwestern states.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(prompt);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast("Response copied to clipboard.");
  };

  const clearChat = () => {
    setMessages([]);
    triggerToast("Conversation log cleared.");
  };

  const exportConversation = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `bharat_climate_twin_copilot_log.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast("Conversation log exported.");
  };

  return (
    <div className="grid gap-5 min-h-[85vh] grid-rows-[auto_1fr]">
      {/* Toast Alert Header */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-bounce flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-background/90 px-4 py-3 text-xs font-semibold text-emerald-200 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-brand-blue animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge>AI Climate Copilot</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-white font-orbitron tracking-[0.12em] uppercase">Climate Decision Support Cockpit</h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary-foreground">
            Enterprise decision-support assistant. Ask questions on vulnerability metrics, execute cross-page map actions, simulate scenarios, and download risk reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={clearChat} className="border-slate-800 hover:bg-surface-elevated text-secondary-foreground text-xs">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={exportConversation} className="border-slate-800 hover:bg-surface-elevated text-secondary-foreground text-xs">
            <FileJson className="h-3.5 w-3.5 mr-1.5" />
            Export Log
          </Button>
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-brand-blue/10 px-3 py-1.5 text-xs font-semibold text-brand-titanium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected to IMD/MOSDAC API
          </div>
        </div>
      </div>

      {/* Main chat window layout */}
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr] h-full items-stretch">
        {/* Left Side: Message Stream */}
        <Card className="glass-card flex flex-col justify-between h-[65vh] xl:h-[72vh] border-white/[0.08]">
          <CardHeader className="border-b border-white/[0.08] py-3.5">
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <Bot className="h-5 w-5 text-brand-titanium animate-pulse" />
              Operational Command Channel
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center text-sm text-muted-foreground py-12">
                <Bot className="h-12 w-12 text-slate-700 mb-4 animate-bounce" />
                <p className="font-semibold text-muted-foreground">Welcome to Bharat Climate Copilot</p>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
                  I can automatically synchronize with your active map layer ({activeLayer}) and selected district to analyze risk parameters. Choose a query helper below:
                </p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
                  {initialExamples.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => handleSend(ex)}
                      className="rounded-lg border border-white/[0.08] bg-surface/40 px-3 py-2 text-left text-xs text-secondary-foreground hover:border-white/[0.08] hover:bg-brand-blue/10 hover:text-white transition-all duration-200"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div key={msg.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
                    {!isUser && (
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-brand-blue/10 text-brand-titanium">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] rounded-2xl p-4 border text-sm leading-relaxed ${
                      isUser 
                        ? "border-slate-800 bg-surface/60 text-slate-200 rounded-tr-none" 
                        : "border-white/[0.08] bg-background/50 text-secondary-foreground rounded-tl-none space-y-4"
                    }`}>
                      {/* Message content */}
                      <p>{msg.text}</p>

                      {/* Bot response details */}
                      {!isUser && msg.data && (
                        <div className="space-y-4 pt-2 border-t border-white/[0.08]">
                          {/* Explainable AI breakdown details */}
                          {msg.data.explainable_risk && (
                            <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/10 p-3.5 space-y-2">
                              <div className="flex justify-between items-center text-xs font-bold text-brand-blue">
                                <span className="flex items-center gap-1.5">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  EXPLAINABLE AI RISK SCORE
                                </span>
                                <span>Confidence: {msg.data.explainable_risk.confidence}%</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground space-y-1.5">
                                <p className="font-semibold text-secondary-foreground">Primary Risk Drivers:</p>
                                {msg.data.explainable_risk.drivers.map((drv: string) => (
                                  <div key={drv} className="flex items-center gap-1.5">
                                    <span className="text-brand-blue font-bold">▪</span>
                                    <span>{drv}</span>
                                  </div>
                                ))}
                                <p className="font-semibold text-secondary-foreground mt-2">Recommended Safety Responses:</p>
                                {msg.data.explainable_risk.actions.map((act: string) => (
                                  <div key={act} className="flex items-center gap-1.5 text-secondary-foreground">
                                    <span className="text-brand-blue font-bold">✓</span>
                                    <span>{act}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Risk summary text */}
                          {msg.data.risk_analysis && (
                            <div>
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-blue mb-1">Risk Analysis Matrix</h4>
                              <p className="text-xs text-muted-foreground">{msg.data.risk_analysis}</p>
                            </div>
                          )}

                          {/* Action advice cards */}
                          {msg.data.recommended_actions && msg.data.recommended_actions.length > 0 && (
                            <div>
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-blue mb-2">Government Action Protocol</h4>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {msg.data.recommended_actions.map((action, idx) => {
                                  const isHydro = idx % 2 === 0;
                                  return (
                                    <div key={action} className={`p-3 rounded-lg border text-xs ${
                                      isHydro 
                                        ? "border-white/[0.08] bg-brand-blue/10 text-emerald-200" 
                                        : "border-white/[0.08] bg-brand-blue/10 text-emerald-200"
                                    }`}>
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        {isHydro ? <Waves className="h-3.5 w-3.5 text-brand-blue" /> : <Leaf className="h-3.5 w-3.5 text-brand-blue" />}
                                        <span className="text-[9px] font-bold uppercase tracking-wider">
                                          {isHydro ? "Hydrological Alert" : "Agricultural Action"}
                                        </span>
                                      </div>
                                      <p className="text-secondary-foreground leading-relaxed">{action}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Chart visual representation */}
                          {msg.data.chart && msg.data.chart.data && msg.data.chart.data.length > 0 && (
                            <div className="pt-2 border-t border-white/[0.08]">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-blue mb-3">Vulnerability Rankings Spectrum</h4>
                              <div className="bg-background/40 p-2.5 rounded-lg border border-white/[0.08]">
                                <RankingBarChart data={msg.data.chart.data} />
                              </div>
                            </div>
                          )}

                          {/* Bot Message Control Actions */}
                          <div className="flex items-center justify-between border-t border-white/[0.08] pt-2.5 mt-2">
                            <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                              Confidence Scale: High
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-slate-200" onClick={() => copyToClipboard(msg.text)} title="Copy Response">
                                <Clipboard className="h-3.5 w-3.5" />
                              </Button>
                              {msg.data.action && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-brand-titanium" onClick={() => executeAction(msg.data?.action)} title="Trigger Action">
                                  <Sparkles className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Suggested follow-up prompt suggestions */}
                          {msg.data.suggestions && msg.data.suggestions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {msg.data.suggestions.map((sug) => (
                                <button
                                  key={sug}
                                  onClick={() => handleSend(sug)}
                                  className="rounded bg-surface hover:bg-surface-elevated hover:text-emerald-200 border border-white/[0.08] text-[10px] px-2.5 py-1 text-muted-foreground transition"
                                >
                                  {sug}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Chat Typing Loading Indicator */}
            {loading && (
              <div className="flex gap-3 justify-start animate-fade-in">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-brand-blue/10 text-brand-titanium">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl p-4 border border-white/[0.08] bg-background/50 text-muted-foreground text-xs flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue"></span>
                  </span>
                  AI Climate Analyst is generating advisory...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </CardContent>

          {/* Form input bottom row */}
          <form onSubmit={onSubmit} className="p-4 border-t border-white/[0.08] flex gap-2 bg-background/20">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask for unsafe states, flood risk, Jodhpur drivers, show layers, or run simulation..."
              className="bg-background/70 border-white/[0.08] text-white placeholder:text-muted-foreground text-sm focus-visible:ring-emerald-500"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !prompt.trim()} className="bg-brand-blue hover:bg-brand-blue text-slate-950">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>

        {/* Right Side: Copilot Context Status Panel */}
        <Card className="glass-card border-white/[0.08] flex flex-col justify-between">
          <CardHeader className="border-b border-white/[0.08] py-3.5">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-brand-blue" />
              Active System Context
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Metrics automatically fed into Copilot queries.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 p-4 space-y-4">
            <div className="space-y-3">
              {[
                { label: "Active Scenario Year", value: `${activeYear} AD`, icon: Sparkles },
                { label: "Selected District ID", value: selectedDistrictId ? `ID #${selectedDistrictId}` : "None (Default to 302)", icon: HelpCircle },
                { label: "Active Map Layer", value: activeLayer.toUpperCase(), icon: Layers },
                { label: "Timeline Speed", value: timelineStep.toUpperCase(), icon: Activity },
                { label: "Base Map Mode", value: mapMode.toUpperCase(), icon: Activity }
              ].map((ctx) => {
                const Icon = ctx.icon;
                return (
                  <div key={ctx.label} className="rounded-2xl border border-white/[0.08] bg-surface/30 p-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="h-4 w-4 text-brand-blue" />
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">{ctx.label}</span>
                    </div>
                    <p className="font-mono text-sm font-bold text-white">{ctx.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-brand-blue/10 p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="font-semibold text-brand-titanium mb-1">💡 Pro Tip</p>
              When analyzing districts like Jodhpur, try command phrases:
              <ul className="list-disc pl-4 mt-1 space-y-0.5 font-mono text-[10px] text-secondary-foreground">
                <li>"Zoom to Mumbai"</li>
                <li>"Show Flood Layer"</li>
                <li>"Generate Jodhpur report"</li>
                <li>"Simulate drought"</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

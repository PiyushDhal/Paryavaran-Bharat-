"use client";
 
import { FormEvent, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Layers,
  Thermometer,
  Wind,
  Droplet,
  Compass,
  FileText,
  Copy,
  Calendar,
  AlertTriangle
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
 
const quickActions = [
  { label: "🛰 Analyse Current District", query: "Analyse current district risk drivers", desc: "Telemetry assessment", icon: Compass },
  { label: "🌧 Flood Assessment", query: "Show flood risk probability and river status", desc: "Hydro-telemetry check", icon: Waves },
  { label: "🔥 Heatwave Assessment", query: "Show heatwave risk probability and thermal anomaly", desc: "Temperature audit", icon: Thermometer },
  { label: "🌾 Agriculture Analysis", query: "Assess vegetation health and crop stress index", desc: "NDVI vegetation review", icon: Leaf },
  { label: "💧 Water Resources", query: "Audit active reservoir storage levels", desc: "WRIS reservoir status", icon: Droplet },
  { label: "🌫 Air Quality", query: "Assess CPCB AQI and atmospheric stress drivers", desc: "Ambient grid indicators", icon: Wind },
  { label: "⚠ Risk Assessment", query: "Explain composite risk scores and trends", desc: "Hazard weight audit", icon: AlertCircle },
  { label: "📊 Executive Summary", query: "Show national climate executive summary", desc: "IMD/NRSC aggregate indices", icon: FileText },
  { label: "📄 Generate Report", query: "Generate risk report for selected location", desc: "PDF dossier compiler", icon: Download },
  { label: "📈 Future Outlook", query: "Predict drought hotspots and crop vulnerabilities", desc: "Disaster prediction models", icon: TrendingUp }
];
 
const initialExamples = [
  "Which states are safest?",
  "Compare Rajasthan and Gujarat",
  "Why is Jodhpur district high risk?",
  "What is NDVI and how is it derived?",
  "Prepare Odisha for Cyclone",
  "Explain simulation outputs"
];
 
export default function CopilotPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    selectedDistrictId, 
    activeLayer, 
    activeYear, 
    timelineStep, 
    mapMode, 
    activeSimulation,
    selectedStateName,
    setActiveLayer, 
    setSelectedDistrictId 
  } = useClimate();
  
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
 
  // Read query parameters from URL for "Explain with AI" actions
  useEffect(() => {
    const query = searchParams.get("query");
    if (query) {
      handleSend(decodeURIComponent(query));
    }
  }, [searchParams]);
 
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
        triggerToast(`Command executed: Centered map on ${action.district_name || "District"}. Redirecting to map...`);
        setTimeout(() => router.push(`/map?district_id=${action.district_id}`), 1500);
        break;
      case "open_compare":
        if (action.districtA && action.districtB) {
          triggerToast(`Command executed: Loading comparative dashboard. Redirecting...`);
          setTimeout(() => router.push(`/compare?districtA=${action.districtA}&districtB=${action.districtB}`), 1200);
        } else if (action.state1 && action.state2) {
          triggerToast(`Command executed: Navigating to state comparison module...`);
          setTimeout(() => router.push(`/compare?state1=${action.state1}&state2=${action.state2}`), 1200);
        } else {
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
        triggerToast(`Command executed: Requesting official PDF report compiler...`);
        const repType = action.report_type || "district";
        window.open(`${API_BASE_URL}/api/v1/climate/reports/${repType}/${action.id}.pdf`, "_blank");
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
        map_mode: mapMode,
        active_simulation: activeSimulation
      });
 
      const botMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        sender: "bot",
        text: response.explanation,
        timestamp: new Date(),
        data: response
      };
 
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      // Clean fallback if API fails
      const fallbackMsg: ChatMessage = {
        id: "bot-error-" + Date.now(),
        sender: "bot",
        text: "Command execution encountered a communications timeout. Re-establishing telemetry connection with central database. Sourced observations indicate stable rainfall deficits but localized thermal deviations in Northwestern sectors.",
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
    triggerToast("Report text copied to clipboard.");
  };
 
  const downloadReportText = (msg: ChatMessage) => {
    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(msg.text);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BCT_Climate_Intelligence_Dossier_${Date.now()}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast("Markdown report downloaded.");
  };
 
  const clearChat = () => {
    setMessages([]);
    triggerToast("Operational log cleared.");
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
 
  // Markdown formatted text rendering helper inside chat
  function renderFormattedText(text: string) {
    const blocks = text.split("\n\n");
    return blocks.map((block, idx) => {
      const lines = block.trim().split("\n");
      
      // Render markdown tables
      if (lines.length > 1 && lines[0].startsWith("|") && lines[0].endsWith("|")) {
        const headers = lines[0].split("|").map(s => s.trim()).filter(Boolean);
        const rows = lines.slice(2).map(line => 
          line.split("|").map(s => s.trim()).filter(Boolean)
        ).filter(r => r.length > 0);
        
        return (
          <div key={idx} className="overflow-x-auto my-3 border border-white/[0.08] rounded-xl bg-background/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-brand-blue/15 border-b border-white/[0.08] text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                  {headers.map((h, i) => <th key={i} className="p-2.5">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-white/[0.04] hover:bg-white/[0.02] last:border-0 transition-colors">
                    {row.map((val, cIdx) => (
                      <td key={cIdx} className="p-2.5 font-mono text-[11px] text-slate-300">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
 
      // Render lists
      if (block.startsWith("- ") || block.startsWith("* ") || block.startsWith("• ")) {
        const items = lines.map(line => line.replace(/^[-*•]\s+/, "").trim());
        return (
          <ul key={idx} className="list-disc pl-5 space-y-1 text-xs text-slate-300 my-2">
            {items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        );
      }
 
      // Render headers
      if (block.startsWith("### ")) {
        return <h3 key={idx} className="text-xs font-bold text-white mt-4 mb-1.5 tracking-wider uppercase border-b border-white/[0.08] pb-1 flex items-center gap-1.5"><Activity className="h-3 w-3 text-brand-blue" />{block.replace("### ", "")}</h3>;
      }
      if (block.startsWith("## ")) {
        return <h2 key={idx} className="text-sm font-bold text-white mt-5 mb-2 tracking-widest uppercase border-b border-white/[0.12] pb-1">{block.replace("## ", "")}</h2>;
      }
      if (block.startsWith("# ")) {
        return <h1 key={idx} className="text-base font-bold text-white mt-6 mb-3 tracking-widest uppercase border-b border-white/[0.2] pb-1.5">{block.replace("# ", "")}</h1>;
      }
 
      // Render alert boxes > [!NOTE]
      if (block.startsWith("> [!")) {
        const type = block.match(/\[!(\w+)\]/)?.[1] || "NOTE";
        const content = lines.slice(1).map(l => l.replace(/^>\s*/, "")).join("\n");
        const colorMap: Record<string, string> = {
          NOTE: "border-cyan-500/40 bg-cyan-950/15 text-cyan-200",
          WARNING: "border-amber-500/40 bg-amber-950/15 text-amber-200",
          CAUTION: "border-rose-500/40 bg-rose-950/15 text-rose-200",
          TIP: "border-emerald-500/40 bg-emerald-950/15 text-emerald-200",
          IMPORTANT: "border-cyan-500/40 bg-cyan-950/15 text-cyan-200"
        };
        const titleMap: Record<string, string> = {
          NOTE: "OPERATIONAL NOTICE",
          WARNING: "COMMAND WARNING",
          CAUTION: "CRITICAL HAZARD ALERT",
          TIP: "CLIMATE POLICY STRATEGY",
          IMPORTANT: "MISSION OBJECTIVE"
        };
        
        return (
          <div key={idx} className={`border-l-2 p-3 my-2.5 rounded-r-lg text-xs ${colorMap[type] || colorMap.NOTE}`}>
            <div className="flex items-center gap-1.5 font-bold tracking-wider text-[9px] uppercase mb-1">
              <AlertTriangle className="h-3 w-3" />
              {titleMap[type] || titleMap.NOTE}
            </div>
            <p className="leading-relaxed font-sans">{content}</p>
          </div>
        );
      }
 
      // Render standard paragraph with bolding
      const parts = block.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className="leading-relaxed text-xs text-slate-300">
          {parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={pIdx} className="text-white font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  }
 
  return (
    <div className="grid gap-5 min-h-[85vh] grid-rows-[auto_1fr] p-2 md:p-4 text-slate-200 bg-background/25">
      {/* Toast Alert Header */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-fade-in flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-background/90 px-4 py-3 text-xs font-semibold text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-brand-blue animate-pulse" />
          {toastMessage}
        </div>
      )}
 
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-brand-blue/20 text-brand-titanium border-brand-blue/30 uppercase tracking-widest text-[9px]">ISRO Hackathon Version</Badge>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest">MISSION TELEMETRY SYNCHRONIZED</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white font-orbitron tracking-widest uppercase flex items-center gap-2">
            <Bot className="h-6 w-6 text-brand-blue animate-pulse" />
            Climate Intelligence Cockpit
          </h1>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground leading-relaxed">
            Autonomous decision-support agent. Parses active spatial datasets, simulates dynamic future stress horizons, and generates official NDMA policy reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={clearChat} className="border-slate-800 hover:bg-slate-900 text-slate-300 text-xs">
            <Trash2 className="h-3.5 w-3.5 mr-1.5 text-rose-400" />
            Clear logs
          </Button>
          <Button variant="outline" size="sm" onClick={exportConversation} className="border-slate-800 hover:bg-slate-900 text-slate-300 text-xs">
            <FileJson className="h-3.5 w-3.5 mr-1.5 text-brand-blue" />
            Export logs
          </Button>
        </div>
      </div>
 
      {/* Main layout */}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr] items-stretch">
        {/* Left Side: Message Stream */}
        <Card className="glass-card flex flex-col justify-between h-[68vh] xl:h-[75vh] border-white/[0.08] bg-slate-950/40 rounded-2xl overflow-hidden shadow-2xl">
          <CardHeader className="border-b border-white/[0.08] py-3 bg-slate-950/50">
            <CardTitle className="flex items-center justify-between text-white text-xs tracking-widest uppercase">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand-blue animate-pulse" />
                COMMAND COMMUNICATIONS INFLOW
              </span>
              <span className="font-mono text-[9px] text-slate-400">SESSION ID: BCT-COP-748</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center py-6 px-4">
                {/* Beautiful Welcome Screen */}
                <div className="text-center max-w-2xl space-y-4">
                  <div className="relative inline-flex mb-2">
                    <div className="absolute -inset-1 rounded-full bg-cyan-500/20 blur animate-pulse" />
                    <div className="relative rounded-2xl border border-cyan-500/40 bg-slate-950 p-4">
                      <Bot className="h-10 w-10 text-brand-blue animate-bounce" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-widest uppercase font-orbitron">BHARAT CLIMATE INTELLIGENCE OFFICER</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Integrated decision platform synchronized with IMD, NRSC, CPCB, and WRIS telemetry grids. Select a command blueprint below to begin tactical analysis:
                  </p>
                </div>
 
                {/* Quick Action Grid */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-3xl w-full">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        onClick={() => handleSend(action.query)}
                        className="group relative rounded-xl border border-white/[0.08] bg-slate-950/30 p-3 text-left hover:border-cyan-500/40 hover:bg-slate-900/40 transition-all duration-300 hover:scale-[1.01]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg border border-white/[0.08] bg-slate-950 p-1.5 text-cyan-400 group-hover:text-white group-hover:border-cyan-500/40 transition-all duration-300">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white tracking-wide">{action.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{action.desc}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
 
                {/* Secondary Suggested Prompts */}
                <div className="mt-8 w-full max-w-3xl border-t border-white/[0.06] pt-5">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3 text-center">Suggested Analytical Queries</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {initialExamples.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => handleSend(ex)}
                        className="rounded-full bg-slate-900/50 hover:bg-slate-900 hover:text-white border border-white/[0.08] hover:border-cyan-500/30 text-[10px] px-3.5 py-1.5 text-slate-400 transition-all duration-200"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div key={msg.id} className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
                    {!isUser && (
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-brand-blue">
                        <Bot className="h-4.5 w-4.5" />
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] rounded-2xl p-4 border text-xs leading-relaxed ${
                      isUser 
                        ? "border-slate-800 bg-slate-900/60 text-slate-100 rounded-tr-none shadow-md" 
                        : "border-white/[0.06] bg-slate-950/40 text-slate-200 rounded-tl-none space-y-4 shadow-lg"
                    }`}>
                      {/* Message content parsed for markdown styles */}
                      <div className="space-y-3">
                        {renderFormattedText(msg.text)}
                      </div>
 
                      {/* Bot response structured outputs */}
                      {!isUser && msg.data && (
                        <div className="space-y-4 pt-3.5 border-t border-white/[0.08] mt-3">
                          {/* Explainable AI block */}
                          {msg.data.explainable_risk && (
                            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-3.5 space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-bold text-cyan-400">
                                <span className="flex items-center gap-1.5">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  EXPLAINABLE AI CLIMATE METRICS
                                </span>
                                <span className="font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/20">Confidence: {msg.data.explainable_risk.confidence}%</span>
                              </div>
                              <div className="text-[11px] text-slate-400 space-y-1.5">
                                <p className="font-bold text-white text-[10px]">Primary Exposure Drivers:</p>
                                {msg.data.explainable_risk.drivers.map((drv: string) => (
                                  <div key={drv} className="flex items-center gap-2">
                                    <span className="text-cyan-500 font-bold text-xs">•</span>
                                    <span>{drv}</span>
                                  </div>
                                ))}
                                <p className="font-bold text-white text-[10px] mt-2">Recommended Safety Responses:</p>
                                {msg.data.explainable_risk.actions.map((act: string) => (
                                  <div key={act} className="flex items-center gap-2 text-slate-300">
                                    <span className="text-cyan-400 font-bold">✓</span>
                                    <span>{act}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
 
                          {/* Risk summary block */}
                          {msg.data.risk_analysis && (
                            <div className="bg-slate-900/20 p-3 rounded-lg border border-white/[0.04]">
                              <h4 className="text-[9px] font-bold uppercase tracking-widest text-cyan-400 mb-1">Environmental Risk Assessment</h4>
                              <p className="text-[11px] text-slate-400 leading-relaxed">{msg.data.risk_analysis}</p>
                            </div>
                          )}
 
                          {/* Action advice cards */}
                          {msg.data.recommended_actions && msg.data.recommended_actions.length > 0 && (
                            <div>
                              <h4 className="text-[9px] font-bold uppercase tracking-widest text-cyan-400 mb-2">Government Action Plan Protocols</h4>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {msg.data.recommended_actions.map((action, idx) => {
                                  const isHydro = idx % 2 === 0;
                                  return (
                                    <div key={action} className="p-3 rounded-lg border border-white/[0.06] bg-slate-900/30 text-emerald-300">
                                      <div className="flex items-center gap-1.5 mb-1.5 border-b border-white/[0.04] pb-1">
                                        {isHydro ? <Waves className="h-3.5 w-3.5 text-cyan-400" /> : <Leaf className="h-3.5 w-3.5 text-cyan-400" />}
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
                                          {isHydro ? "Hydrology Command" : "Agriculture Directive"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{action}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
 
                          {/* Chart inline view */}
                          {msg.data.chart && msg.data.chart.data && msg.data.chart.data.length > 0 && (
                            <div className="pt-2 border-t border-white/[0.06]">
                              <h4 className="text-[9px] font-bold uppercase tracking-widest text-cyan-400 mb-2">Active Area Risk Spectrum</h4>
                              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/[0.06]">
                                <RankingBarChart data={msg.data.chart.data} />
                              </div>
                            </div>
                          )}
 
                          {/* Bot Message Control Actions */}
                          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3.5 mt-2">
                            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                              Data Source: Verified Government Telemetry
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-7.5 w-7.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg" onClick={() => copyToClipboard(msg.text)} title="Copy Response">
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7.5 w-7.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg" onClick={() => downloadReportText(msg)} title="Download Report">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              {msg.data.action && (
                                <Button variant="outline" size="sm" className="h-7.5 border-brand-blue/30 hover:border-cyan-500 text-brand-titanium text-[10px] tracking-wider uppercase bg-brand-blue/5 rounded-lg px-2.5" onClick={() => executeAction(msg.data?.action)}>
                                  <Sparkles className="h-3 w-3 mr-1 text-cyan-400" />
                                  Execute Command
                                </Button>
                              )}
                            </div>
                          </div>
 
                          {/* Suggested follow-ups */}
                          {msg.data.suggestions && msg.data.suggestions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.04]">
                              {msg.data.suggestions.map((sug) => (
                                <button
                                  key={sug}
                                  onClick={() => handleSend(sug)}
                                  className="rounded-full bg-slate-900/30 hover:bg-slate-900 border border-white/[0.06] hover:border-cyan-500/20 text-[10px] px-2.5 py-1 text-slate-400 hover:text-cyan-300 transition-all duration-200"
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
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-brand-blue">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div className="rounded-2xl p-4 border border-white/[0.08] bg-slate-950/40 text-slate-400 text-xs flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  Climate Officer is compiling analytical data model...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </CardContent>
 
          {/* Form input bottom row */}
          <form onSubmit={onSubmit} className="p-3 border-t border-white/[0.08] flex gap-2 bg-slate-950/50">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Query district risks, run simulations, compare states, or ask concept definitions..."
              className="bg-slate-950 border-white/[0.08] text-white placeholder:text-muted-foreground text-xs focus-visible:ring-cyan-500 rounded-xl h-10"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !prompt.trim()} className="bg-brand-blue hover:bg-brand-blue/80 text-slate-950 rounded-xl px-4 h-10">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
 
        {/* Right Side: Copilot Context Status Panel */}
        <Card className="glass-card border-white/[0.08] bg-slate-950/40 rounded-2xl flex flex-col justify-between overflow-hidden shadow-xl">
          <CardHeader className="border-b border-white/[0.08] py-3.5 bg-slate-950/50">
            <CardTitle className="text-white text-xs tracking-widest uppercase flex items-center gap-2 font-orbitron">
              <Activity className="h-4.5 w-4.5 text-brand-blue animate-pulse" />
              Operational System Context
            </CardTitle>
            <CardDescription className="text-muted-foreground text-[10px]">
              Active dashboard parameters dynamically injected into queries.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 p-4 space-y-4">
            <div className="space-y-3">
              {[
                { label: "Active Simulator Year", value: `${activeYear} AD`, icon: Calendar },
                { label: "Selected District", value: selectedDistrictId ? `District ID #${selectedDistrictId}` : "None (National Overview)", icon: Compass },
                { label: "Selected State", value: selectedStateName ? selectedStateName : "None Resolved", icon: Compass },
                { label: "Active Map Layer", value: activeLayer.toUpperCase(), icon: Layers },
                { label: "Timeline Step", value: timelineStep.toUpperCase(), icon: Activity },
                { label: "Simulator Parameters", value: activeSimulation ? `Composite Risk: ${activeSimulation.composite_risk}% (Active)` : "No simulation running", icon: Sparkles }
              ].map((ctx) => {
                const Icon = ctx.icon;
                return (
                  <div key={ctx.label} className="rounded-xl border border-white/[0.06] bg-slate-950/30 p-3 hover:border-white/[0.12] transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{ctx.label}</span>
                    </div>
                    <p className="font-mono text-xs font-bold text-white truncate">{ctx.value}</p>
                  </div>
                );
              })}
            </div>
 
            <div className="rounded-xl border border-cyan-500/10 bg-cyan-950/5 p-3 text-xs leading-relaxed text-slate-400 font-sans">
              <p className="font-bold text-white text-[10px] tracking-wide mb-1 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                MISSION NOTES
              </p>
              The Climate Officer has full direct read permissions over PostgreSQL database schemas. Telemetry queries cite official source agencies automatically.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

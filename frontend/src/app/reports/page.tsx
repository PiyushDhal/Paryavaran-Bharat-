"use client";

import { useEffect, useState, useMemo } from "react";
import { Download, FileText, Printer, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_DISTRICTS, generateRankings } from "@/lib/mock/engine";
import { riskColor } from "@/lib/utils";

export default function ReportsPage() {
  const [districtId, setDistrictId] = useState<number>(101);
  const [year, setYear] = useState<number>(2030);
  const [sector, setSector] = useState<string>("water");
  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);

  const district = MOCK_DISTRICTS.find((d) => d.id === districtId) || MOCK_DISTRICTS[0];
  const rankings = useMemo(() => generateRankings(year), [year]);
  const ranking = rankings.find((r) => r.district_id === districtId) || rankings[0];

  function handleGenerate() {
    setGenerating(true);
    setReportReady(false);
    setTimeout(() => {
      setGenerating(false);
      setReportReady(true);
    }, 800);
  }

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  const generatedContent = useMemo(() => {
    const baseline = `Climate Risk profile for district ${district.name} (${district.state_name}) in the scenario year ${year} AD indicates a composite risk score of ${ranking.composite_risk}/100. The district supports a population of ${district.population.toLocaleString()} across a geographical territory of ${district.area_sq_km} sq km.`;
    
    let sectorAdvice = "";
    if (sector === "water") {
      sectorAdvice = `HYDROLOLOGICAL ADVISORY: Under the SSP5-8.5 emissions pathway, water stress vulnerability for ${district.name} reaches ${ranking.water_stress_risk}/100. Extreme reservoir drawdowns are anticipated. Municipal distribution layers should schedule aquifer replenishment cycles and enforce rainwater harvesting mandates at block scales.`;
    } else if (sector === "agriculture") {
      sectorAdvice = `AGRICULTURAL CONTINGENCY: Drought indicators are scored at ${ranking.drought_risk}/100. Heat stress anomalies will disrupt kharif oilseed and pulse yields. Command center recommends allocating seed subsidies for climate-resilient crop varieties (e.g. pearl millet, sorghum) and deploying localized drip irrigation grids.`;
    } else if (sector === "infrastructure") {
      sectorAdvice = `INFRASTRUCTURE RESILIENCE: With flood probabilities peaking at ${ranking.flood_risk}/100, coastal and river embankment arrays face critical storm surge and runoff loads. Emergency services must execute safety buffer compliance inspections on low-lying power distribution nodes and sewage pump-out lines.`;
    } else {
      sectorAdvice = `PUBLIC HEALTH DIRECTIVE: Thermal discomfort indicators (Heatwave index scored at ${ranking.heatwave_risk}/100) indicate extreme heat dome duration surges. Local authorities should establish cooled shelter zones, adapt industrial outdoor work shifts to peak-temperature limits, and stock regional dispensaries with hydration/stroke assets.`;
    }

    return {
      title: `NATIONAL CLIMATE TWIN SECURITY REPORT`,
      refNo: `BCT-REP-${district.code}-${year}`,
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
      baseline,
      sectorAdvice,
      certification: `Certified by Bharat Climate Twin AI Forecaster Layer v1.2.0 (MOSDAC & IMD Sync)`
    };
  }, [district, year, sector, ranking]);

  return (
    <div className="grid gap-5">
      {/* CSS style overlay to handle printing elegantly */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
            background: transparent !important;
            color: #000 !important;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 no-print">
        <div>
          <Badge>AI Intelligence Reports</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">AI Report Generator</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Generate printable, government-grade climate security and risk reports for local state authorities and disaster management task forces.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr] no-print">
        {/* Report configuration */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              Configure Report Parameters
            </CardTitle>
            <CardDescription>Select target area and focus domains for AI synthesis.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase">Target District</label>
              <select
                value={districtId}
                onChange={(e) => setDistrictId(Number(e.target.value))}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                {MOCK_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}, {d.state_name}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase">Scenario Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                {[2020, 2025, 2030, 2040, 2050].map((y) => (
                  <option key={y} value={y}>{y} AD</option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase">Primary Sector Focus</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="water">Water Resources & Storage</option>
                <option value="agriculture">Agricultural Crops & Drought</option>
                <option value="infrastructure">Coastal & Flood Infrastructure</option>
                <option value="health">Public Health & Thermal Heatwaves</option>
              </select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold"
            >
              {generating ? "Synthesizing AI Summary..." : "Compile Report"}
            </Button>
          </CardContent>
        </Card>

        {/* Status Area */}
        {!reportReady && !generating && (
          <div className="grid min-h-[380px] place-items-center rounded-xl border border-dashed border-cyan-300/20 text-center text-sm text-slate-500 bg-slate-950/20">
            <div>
              <FileText className="h-10 w-10 mx-auto text-slate-700 mb-4" />
              Configure parameters and click compile to generate the climate security report.
            </div>
          </div>
        )}

        {generating && (
          <div className="grid min-h-[380px] place-items-center rounded-xl border border-cyan-300/20 text-center text-sm text-slate-300 bg-slate-950/20 animate-pulse">
            <div>
              <FileText className="h-10 w-10 mx-auto text-cyan-400 mb-4 animate-spin" />
              Consulting model forecasting layers and telemetry datasets...
            </div>
          </div>
        )}

        {reportReady && (
          <Card className="glass-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-cyan-300/10 pb-4">
              <div>
                <CardTitle>AI Generated Preview</CardTitle>
                <CardDescription>Print-ready certified memorandum.</CardDescription>
              </div>
              <Button onClick={handlePrint} size="sm" variant="outline" className="border-slate-700 hover:bg-slate-800 gap-1.5 text-white">
                <Printer className="h-3.5 w-3.5" />
                Print / Save PDF
              </Button>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Document frame styled like standard memorandum */}
              <div id="print-area" className="border border-cyan-500/10 rounded-lg p-6 bg-slate-900/10 text-slate-300 font-serif leading-relaxed">
                {/* Header branding */}
                <div className="border-b-2 border-slate-700 pb-5 text-center flex flex-col items-center">
                  <div className="w-9 h-9 rounded bg-cyan-400/10 border border-cyan-400/30 grid place-items-center text-cyan-400 mb-2 no-print">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-extrabold tracking-widest text-white uppercase font-sans">
                    Government of India — Climate Twin Command
                  </h2>
                  <p className="text-[10px] tracking-wider text-cyan-300 font-sans font-semibold mt-1">
                    NATIONAL SECURITY MEMORANDUM FOR EOC AND ADVISORIES
                  </p>
                </div>

                {/* Metadata metadata */}
                <div className="grid grid-cols-2 gap-4 text-xs font-sans border-b border-slate-800 py-4 text-slate-400">
                  <div>
                    <span className="font-bold block text-slate-500">REPORT REFERENCE:</span>
                    <span className="font-mono text-white text-[11px]">{generatedContent.refNo}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold block text-slate-500">DATE COMPILED:</span>
                    <span className="text-white">{generatedContent.date}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-slate-500">LOCATION FOCUS:</span>
                    <span className="text-white">{district.name} District, {district.state_name} UT/State</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold block text-slate-500">PROJECTION HORIZON:</span>
                    <span className="text-cyan-300 font-semibold">{year} AD Target</span>
                  </div>
                </div>

                {/* Narrative */}
                <div className="py-6 space-y-5 text-sm font-serif text-slate-300 antialiased">
                  <p className="indent-8">{generatedContent.baseline}</p>
                  
                  <div className="grid grid-cols-3 gap-2.5 py-4 font-sans text-center">
                    <div className="p-2.5 border border-slate-800 bg-slate-950/20 rounded">
                      <span className="text-[9px] text-slate-500 font-bold block">FLOOD STRESS</span>
                      <span className="text-sm font-bold text-white font-mono">{ranking.flood_risk}</span>
                    </div>
                    <div className="p-2.5 border border-slate-800 bg-slate-950/20 rounded">
                      <span className="text-[9px] text-slate-500 font-bold block">DROUGHT STRESS</span>
                      <span className="text-sm font-bold text-white font-mono">{ranking.drought_risk}</span>
                    </div>
                    <div className="p-2.5 border border-slate-800 bg-slate-950/20 rounded">
                      <span className="text-[9px] text-slate-500 font-bold block">COMPOSITE RISK</span>
                      <span className={`text-sm font-bold font-mono ${riskColor(ranking.composite_risk)}`}>{ranking.composite_risk}</span>
                    </div>
                  </div>

                  <p className="border-l-2 border-cyan-400 pl-4 italic text-cyan-200 bg-cyan-400/5 py-3 rounded-r">{generatedContent.sectorAdvice}</p>

                  <p>Command operational protocols recommend immediate coordination between regional ministries and early alert dispatch centers to mitigate these hazards before thresholds are exceeded.</p>
                </div>

                {/* Signature / Authority footer */}
                <div className="border-t border-slate-800 pt-5 mt-4 flex justify-between items-center text-[10px] font-sans text-slate-500">
                  <span>{generatedContent.certification}</span>
                  <span className="italic">Signed digitally — Climate Command Layer</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, useRef } from "react";

// ── Dropdown Options (For UI Selection Only) ──
const PATIENTS = [
  { id: "P-102", label: "P-102 — Rajesh Kumar (CKD + Lisinopril)" },
  { id: "P-205", label: "P-205 — Priya Sharma (Diabetes)" },
  { id: "P-318", label: "P-318 — Arjun Mehta (Hyperlipidemia)" }
];

const DRUGS = ["Ibuprofen", "Aspirin", "Metformin"];

// ── Call Local Python Server (Which calls AWS Bedrock) ──
async function consultBedrockAgent(patientId:string, drug:string, reason:string) {
  try {
    const url = `https://ai-health-agent-8axv.onrender.com/api/consult?patient_id=${encodeURIComponent(patientId)}&drug=${encodeURIComponent(drug)}&reason=${encodeURIComponent(reason)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Backend connection failed");
    const data = await response.json();
    return data.verdict;
  } catch (error) {
    return "🛑 ERROR: Failed to connect to AWS Backend. Ensure FastAPI server is running.";
  }
}

// ── Delay helper & Sub-components ──
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function LogLine({ item, visible }) {
  return (
    <div style={{
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: "all 0.4s ease", marginBottom: "6px", display: "flex", alignItems: "flex-start", gap: "10px"
    }}>
      <span style={{ color: item.color || "#64ffda", fontSize: "11px", fontFamily: "monospace", minWidth: "70px", paddingTop: "2px" }}>
        {item.time}
      </span>
      <span style={{ fontSize: "13px", color: item.color || "#cdd9e5", lineHeight: 1.5 }}>
        {item.icon && <span style={{ marginRight: "6px" }}>{item.icon}</span>}
        {item.text}
      </span>
    </div>
  );
}

function AgentCard({ agent, active, done, result }) {
  return (
    <div style={{
      border: `1px solid ${active ? agent.color : done ? "#2a3a2a" : "#1e2a35"}`, borderRadius: "10px", padding: "16px",
      background: active ? `${agent.color}08` : done ? "#0d1a0d" : "#0a1520", transition: "all 0.5s ease", position: "relative", overflow: "hidden"
    }}>
      {active && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)`, animation: "scanLine 1.5s ease-in-out infinite" }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <span style={{ fontSize: "22px" }}>{agent.icon}</span>
        <div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: active ? agent.color : done ? "#7ec87e" : "#4a6080", fontFamily: "monospace" }}>{agent.name}</div>
          <div style={{ fontSize: "10px", color: "#445566" }}>{agent.role}</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          {active && <span style={{ fontSize: "10px", color: agent.color, animation: "pulse 1s infinite" }}>● ACTIVE</span>}
          {done && <span style={{ fontSize: "10px", color: "#7ec87e" }}>✓ DONE</span>}
          {!active && !done && <span style={{ fontSize: "10px", color: "#334" }}>○ IDLE</span>}
        </div>
      </div>
      {(active || done) && result && (
        <div style={{ background: "#060e18", borderRadius: "6px", padding: "10px", fontSize: "11px", color: "#8899aa", fontFamily: "monospace", lineHeight: 1.6 }}>{result}</div>
      )}
    </div>
  );
}

// ── Main App ──
export default function MedAISystem() {
  const [patientId, setPatientId] = useState("P-102");
  const [drug, setDrug] = useState("Ibuprofen");
  const [reason, setReason] = useState("severe joint pain");
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [logs, setLogs] = useState([]);
  const [visibleLogs, setVisibleLogs] = useState([]);
  
  const [finalVerdict, setFinalVerdict] = useState(null);
  const [ehrActive, setEhrActive] = useState(false);
  const [ehrDone, setEhrDone] = useState(false);
  const [resActive, setResActive] = useState(false);
  const [resDone, setResDone] = useState(false);
  const [supActive, setSupActive] = useState(false);
  
  const logsEndRef = useRef(null);

  const addLog = (text: string, icon?: string, color?: string) => {
    const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => {
      const next = [...prev, { text, icon, color, time }];
      setTimeout(() => setVisibleLogs(v => [...v, next.length - 1]), 50);
      return next;
    });
  };

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const reset = () => {
    setStage(0); setLogs([]); setVisibleLogs([]); setFinalVerdict(null);
    setEhrActive(false); setEhrDone(false); setResActive(false); setResDone(false); setSupActive(false);
  };

  const run = async () => {
    reset();
    await delay(100);
    setRunning(true);

    // STAGE 1
    setStage(1);
    addLog(`Doctor query received: "${reason}" → prescribe ${drug} for patient ${patientId}`, "📋", "#64b5f6");
    await delay(600);

    // STAGE 2: Start AWS Bedrock Call
    setStage(2);
    setSupActive(true);
    addLog("Supervisor Agent triggered — Delegating tasks to AWS Bedrock Sub-Agents...", "🤖", "#ce93d8");
    
    // FIRE THE REAL AWS CALL IN THE BACKGROUND
    const bedrockPromise = consultBedrockAgent(patientId, drug, reason);
    await delay(800);

    // STAGE 3: UI Animations while AWS thinks
    setStage(3);
    setSupActive(false); setEhrActive(true); setResActive(true);
    addLog("EHR Specialist querying DynamoDB via Lambda...", "🩺", "#4db6ac");
    addLog("Medical Researcher searching OpenSearch Knowledge Base...", "🔬", "#ffb74d");
    
    // WAIT FOR ACTUAL AWS RESPONSE
    const realVerdict = await bedrockPromise;

    // STAGE 4: Synthesis
    setEhrActive(false); setEhrDone(true); setResActive(false); setResDone(true);
    setStage(4);
    setSupActive(true);
    addLog("AWS Bedrock execution complete. Supervisor synthesizing findings...", "🧠", "#ce93d8");
    await delay(800);

    // STAGE 5: Final Output
    setSupActive(false);
    setFinalVerdict(realVerdict);
    setStage(5);

    const isContraindicated = realVerdict.toLowerCase().includes("contraindicated") || realVerdict.toLowerCase().includes("warning");
    addLog(isContraindicated ? `🛑 SAFETY ALERT: Check Verdict` : `✅ Analysis complete — Safe to proceed`, isContraindicated ? "🛑" : "✅", isContraindicated ? "#ef5350" : "#66bb6a");
    setRunning(false);
  };

  const agents = [
    { id: "sup", name: "AWS BEDROCK SUPERVISOR", role: "Nova Pro Master Agent", icon: "🤖", color: "#ce93d8" },
    { id: "ehr", name: "EHR SPECIALIST", role: "DynamoDB via Lambda", icon: "🩺", color: "#4db6ac" },
    { id: "res", name: "MEDICAL RESEARCHER", role: "Bedrock KB / OpenSearch", icon: "🔬", color: "#ffb74d" }
  ];

  const verdictColor = finalVerdict?.toLowerCase().includes("contraindicated") ? "#ef5350" : finalVerdict?.toLowerCase().includes("warning") ? "#ffa726" : "#66bb6a";

  return (
    <div style={{ minHeight: "100vh", background: "#050d1a", color: "#cdd9e5", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", padding: "24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes scanLine { 0%,100%{opacity:0;transform:translateX(-100%)} 50%{opacity:1;transform:translateX(100%)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px #ef535022} 50%{box-shadow:0 0 40px #ef535055} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0a1520} ::-webkit-scrollbar-thumb{background:#2a3a4a;border-radius:2px}
        select,input{background:#0a1520!important;color:#cdd9e5!important;border:1px solid #1e2a35!important;border-radius:6px!important;padding:8px 12px!important;font-family:inherit!important;font-size:12px!important;outline:none!important;width:100%!important;box-sizing:border-box!important;}
        select:focus,input:focus{border-color:#4a6a8a!important} option{background:#0a1520}
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ fontSize: "11px", color: "#4a6a8a", letterSpacing: "4px", marginBottom: "8px" }}>AWS SERVERLESS ARCHITECTURE</div>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: 0, fontFamily: "'Space Grotesk', sans-serif", background: "linear-gradient(135deg, #64b5f6, #ce93d8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MedAI Supervisor System</h1>
        <div style={{ fontSize: "12px", color: "#445566", marginTop: "6px" }}>Powered by Amazon Bedrock Multi-Agent Collaboration</div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "340px 1fr", gap: "20px" }}>
        {/* LEFT PANEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Query Input */}
          <div style={{ background: "#0a1520", border: "1px solid #1e2a35", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "10px", color: "#4a6a8a", letterSpacing: "3px", marginBottom: "16px" }}>STAGE 1 · DOCTOR QUERY</div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "10px", color: "#667788", marginBottom: "5px", display: "block" }}>PATIENT ID</label>
              <select value={patientId} onChange={e => setPatientId(e.target.value)} disabled={running}>
                {PATIENTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "10px", color: "#667788", marginBottom: "5px", display: "block" }}>DRUG TO PRESCRIBE</label>
              <select value={drug} onChange={e => setDrug(e.target.value)} disabled={running}>
                {DRUGS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "10px", color: "#667788", marginBottom: "5px", display: "block" }}>REASON</label>
              <input value={reason} onChange={e => setReason(e.target.value)} disabled={running} placeholder="e.g. severe joint pain" />
            </div>
            <button onClick={running ? null : run} disabled={running} style={{ width: "100%", padding: "12px", border: "none", borderRadius: "8px", background: running ? "#1a2a3a" : "linear-gradient(135deg, #1565c0, #6a1b9a)", color: running ? "#445566" : "#fff", fontSize: "13px", fontWeight: "700", fontFamily: "inherit", cursor: running ? "not-allowed" : "pointer", transition: "all 0.3s" }}>
              {running ? "⏳ AGENTS WORKING..." : "▶ RUN SAFETY CHECK"}
            </button>
          </div>

          {/* Agent Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <AgentCard agent={agents[0]} active={supActive} done={stage >= 4 && !supActive} result={stage >= 4 ? "Synthesis complete via Bedrock" : null} />
            <AgentCard agent={agents[1]} active={ehrActive} done={ehrDone} result={ehrDone ? "EHR Data Retrieved via Lambda" : null} />
            <AgentCard agent={agents[2]} active={resActive} done={resDone} result={resDone ? "Guidelines Searched via OpenSearch" : null} />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Live Log */}
          <div style={{ background: "#0a1520", border: "1px solid #1e2a35", borderRadius: "12px", padding: "20px", height: "300px", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "10px", color: "#4a6a8a", letterSpacing: "3px", marginBottom: "14px" }}>
              AGENT ACTIVITY LOG {running && <span style={{ marginLeft: "12px", color: "#64b5f6", animation: "pulse 1s infinite" }}>● LIVE</span>}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {logs.map((item, i) => <LogLine key={i} item={item} visible={visibleLogs.includes(i)} />)}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Final Verdict */}
          {finalVerdict && (
            <div style={{ background: "#0a1520", borderRadius: "12px", padding: "20px", border: `2px solid ${verdictColor}`, animation: "fadeIn 0.5s ease", ...(verdictColor === "#ef5350" ? { animation: "fadeIn 0.5s ease, glow 2s ease-in-out infinite" } : {}) }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: `${verdictColor}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", border: `1px solid ${verdictColor}44` }}>
                  {finalVerdict.toLowerCase().includes("contraindicated") ? "🛑" : "✅"}
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#4a6a8a", letterSpacing: "3px" }}>STAGE 4 · AWS BEDROCK VERDICT</div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: verdictColor, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {finalVerdict.toLowerCase().includes("contraindicated") ? "CONTRAINDICATED / WARNING" : "ANALYSIS COMPLETE"}
                  </div>
                </div>
              </div>
              <div style={{ background: "#060e18", borderRadius: "8px", padding: "16px", fontSize: "12px", color: "#aabbcc", lineHeight: 1.8, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                {finalVerdict}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
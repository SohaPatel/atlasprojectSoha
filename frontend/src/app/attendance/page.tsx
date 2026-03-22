"use client";

import { useState, useEffect } from "react";

interface AtRiskStudent {
  student_id: string;
  student_name: string;
  overall_percentage: number;
  risk_level: string;
}

interface LeaveRequest {
  id: number;
  student_id: string;
  student_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: string;
  ai_recommendation: string;
  ai_risk_score: number;
}

interface AttendanceRecord {
  id: number;
  student_id: string;
  student_name: string;
  subject: string;
  date: string;
  status: string;
  marked_by: string;
}

interface MedicalVerification {
  status: string;
  message: string;
  valid: boolean | null;
}

export default function AttendancePage() {
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [medicalVerification, setMedicalVerification] = useState<MedicalVerification>({ status: "", message: "", valid: null });

  const [markForm, setMarkForm] = useState({
    student_id: "",
    student_name: "",
    subject: "",
    date: "",
    status: "PRESENT",
    marked_by: "",
  });

  const [leaveForm, setLeaveForm] = useState({
    student_id: "",
    student_name: "",
    leave_type: "MEDICAL",
    from_date: "",
    to_date: "",
    reason: "",
  });

  const [analyzeId, setAnalyzeId] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [message, setMessage] = useState("");

  const API = "http://localhost:8000";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [riskRes, leaveRes, attendanceRes] = await Promise.all([
        fetch(`${API}/api/attendance/at-risk`),
        fetch(`${API}/api/attendance/leave/all`),
        fetch(`${API}/api/attendance/all`),
      ]);
      setAtRiskStudents(await riskRes.json());
      setLeaveRequests(await leaveRes.json());
      setAllAttendance(await attendanceRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const markAttendance = async () => {
    try {
      const res = await fetch(`${API}/api/attendance/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...markForm }),
      });
      if (res.ok) {
        setMessage("✅ Attendance marked successfully!");
        setMarkForm({ student_id: "", student_name: "", subject: "", date: "", status: "PRESENT", marked_by: "" });
        fetchData();
      }
    } catch (e) {
      setMessage("❌ Error marking attendance");
    }
  };

  const submitLeave = async () => {
    if (leaveForm.leave_type === "MEDICAL" && medicalVerification.valid === false) {
      setMessage("❌ Please upload a valid medical certificate before submitting.");
      return;
    }
    try {
      const res = await fetch(`${API}/api/attendance/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leaveForm }),
      });
      if (res.ok) {
        setMessage("✅ Leave request submitted! AI has analyzed it.");
        setLeaveForm({ student_id: "", student_name: "", leave_type: "MEDICAL", from_date: "", to_date: "", reason: "" });
        setMedicalVerification({ status: "", message: "", valid: null });
        fetchData();
      }
    } catch (e) {
      setMessage("❌ Error submitting leave");
    }
  };

  const analyzeStudent = async () => {
    try {
      const res = await fetch(`${API}/api/attendance/analyze/${analyzeId}`);
      const data = await res.json();
      setAnalysisResult(data);
    } catch (e) {
      setMessage("❌ Error analyzing student");
    }
  };

  const updateLeaveStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(
        `${API}/api/attendance/leave/${id}/${status.toLowerCase()}?reviewed_by=Admin`,
        { method: "PATCH" }
      );
      if (res.ok) {
        setMessage(`✅ Leave ${status.toLowerCase()}d successfully!`);
        fetchData();
      }
    } catch (e) {
      setMessage("❌ Error updating leave status");
    }
  };

  const handleMedicalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMedicalVerification({ status: "checking", message: "🔍 AI is verifying your document...", valid: null });
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API}/api/attendance/verify-medical-certificate`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.is_valid) {
        setMedicalVerification({ status: "valid", message: `✅ Valid medical document detected! (${data.detected_as})`, valid: true });
      } else {
        setMedicalVerification({ status: "invalid", message: `❌ This does not appear to be a medical certificate. Detected as: ${data.detected_as}. ${data.message}`, valid: false });
      }
    } catch (err) {
      setMedicalVerification({ status: "error", message: "⚠️ Could not verify document. Please try again.", valid: null });
    }
  };

  const getRiskColor = (level: string) => {
    if (level === "CRITICAL") return "#ef4444";
    if (level === "WARNING") return "#f59e0b";
    return "#22c55e";
  };

  const getStatusColor = (status: string) => {
    if (status === "APPROVED") return "#22c55e";
    if (status === "REJECTED") return "#ef4444";
    return "#f59e0b";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#1e293b", padding: "20px 32px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold", color: "#f8fafc" }}>
            🎓 Attendance & Leave Management
          </h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "14px" }}>
            AI-powered university attendance command centre
          </p>
        </div>
        <button onClick={fetchData} style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontSize: "14px" }}>
          🔄 Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: "#1e293b", padding: "0 32px", borderBottom: "1px solid #334155", display: "flex", gap: "4px" }}>
        {["dashboard", "mark", "leave", "manage", "analyze"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: "12px 20px", background: activeTab === tab ? "#3b82f6" : "transparent", color: activeTab === tab ? "white" : "#94a3b8", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: activeTab === tab ? "bold" : "normal", borderBottom: activeTab === tab ? "2px solid #3b82f6" : "2px solid transparent" }}>
            {tab === "dashboard" && "📊 Dashboard"}
            {tab === "mark" && "✏️ Mark Attendance"}
            {tab === "leave" && "📝 Apply Leave"}
            {tab === "manage" && "✅ Manage Leaves"}
            {tab === "analyze" && "🤖 AI Analysis"}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div style={{ margin: "16px 32px", padding: "12px 16px", background: message.includes("✅") ? "#166534" : "#7f1d1d", borderRadius: "8px", fontSize: "14px" }}>
          {message}
          <button onClick={() => setMessage("")} style={{ float: "right", background: "none", border: "none", color: "white", cursor: "pointer" }}>✕</button>
        </div>
      )}

      <div style={{ padding: "24px 32px" }}>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <div style={{ background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
                <p style={{ margin: "0 0 8px", color: "#94a3b8", fontSize: "13px" }}>TOTAL RECORDS</p>
                <p style={{ margin: 0, fontSize: "32px", fontWeight: "bold", color: "#f8fafc" }}>{allAttendance.length}</p>
              </div>
              <div style={{ background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #ef4444" }}>
                <p style={{ margin: "0 0 8px", color: "#94a3b8", fontSize: "13px" }}>AT RISK STUDENTS</p>
                <p style={{ margin: 0, fontSize: "32px", fontWeight: "bold", color: "#ef4444" }}>{atRiskStudents.length}</p>
              </div>
              <div style={{ background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
                <p style={{ margin: "0 0 8px", color: "#94a3b8", fontSize: "13px" }}>PENDING LEAVES</p>
                <p style={{ margin: 0, fontSize: "32px", fontWeight: "bold", color: "#f59e0b" }}>
                  {leaveRequests.filter((l) => l.status === "PENDING").length}
                </p>
              </div>
            </div>

            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155", marginBottom: "24px" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: "16px", color: "#f8fafc" }}>⚠️ At Risk Students</h2>
              {loading ? <p style={{ color: "#94a3b8" }}>Loading...</p> : atRiskStudents.length === 0 ? (
                <p style={{ color: "#22c55e" }}>✅ No students at risk currently!</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ color: "#94a3b8", borderBottom: "1px solid #334155" }}>
                      <th style={{ textAlign: "left", padding: "8px" }}>Student ID</th>
                      <th style={{ textAlign: "left", padding: "8px" }}>Name</th>
                      <th style={{ textAlign: "left", padding: "8px" }}>Attendance %</th>
                      <th style={{ textAlign: "left", padding: "8px" }}>Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRiskStudents.map((s) => (
                      <tr key={s.student_id} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "10px 8px" }}>{s.student_id}</td>
                        <td style={{ padding: "10px 8px" }}>{s.student_name}</td>
                        <td style={{ padding: "10px 8px" }}>{s.overall_percentage}%</td>
                        <td style={{ padding: "10px 8px" }}>
                          <span style={{ background: getRiskColor(s.risk_level), color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "12px" }}>
                            {s.risk_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: "16px", color: "#f8fafc" }}>📋 Recent Attendance Records</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ color: "#94a3b8", borderBottom: "1px solid #334155" }}>
                    <th style={{ textAlign: "left", padding: "8px" }}>Student</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>Subject</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>Date</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allAttendance.slice(0, 10).map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "10px 8px" }}>{r.student_name}</td>
                      <td style={{ padding: "10px 8px" }}>{r.subject}</td>
                      <td style={{ padding: "10px 8px" }}>{r.date}</td>
                      <td style={{ padding: "10px 8px" }}>
                        <span style={{ color: r.status === "PRESENT" ? "#22c55e" : r.status === "LATE" ? "#f59e0b" : "#ef4444" }}>
                          {r.status === "PRESENT" ? "✅" : r.status === "LATE" ? "⏰" : "❌"} {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MARK ATTENDANCE TAB */}
        {activeTab === "mark" && (
          <div style={{ maxWidth: "500px" }}>
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px", border: "1px solid #334155" }}>
              <h2 style={{ margin: "0 0 20px", fontSize: "16px", color: "#f8fafc" }}>✏️ Mark Attendance</h2>
              {[
                { label: "Student ID", key: "student_id", type: "text" },
                { label: "Student Name", key: "student_name", type: "text" },
                { label: "Subject", key: "subject", type: "text" },
                { label: "Date", key: "date", type: "date" },
                { label: "Marked By", key: "marked_by", type: "text" },
              ].map(({ label, key, type }) => (
                <div key={key} style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>{label}</label>
                  <input type={type} value={(markForm as any)[key]}
                    onChange={(e) => setMarkForm({ ...markForm, [key]: e.target.value })}
                    style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", padding: "8px 12px", color: "#f8fafc", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Status</label>
                <select value={markForm.status} onChange={(e) => setMarkForm({ ...markForm, status: e.target.value })}
                  style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", padding: "8px 12px", color: "#f8fafc", fontSize: "14px" }}>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                </select>
              </div>
              <button onClick={markAttendance}
                style={{ width: "100%", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", padding: "12px", cursor: "pointer", fontSize: "15px", fontWeight: "bold" }}>
                Mark Attendance
              </button>
            </div>
          </div>
        )}

        {/* APPLY LEAVE TAB */}
        {activeTab === "leave" && (
          <div style={{ maxWidth: "500px" }}>
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px", border: "1px solid #334155" }}>
              <h2 style={{ margin: "0 0 20px", fontSize: "16px", color: "#f8fafc" }}>📝 Apply for Leave</h2>
              {[
                { label: "Student ID", key: "student_id" },
                { label: "Student Name", key: "student_name" },
                { label: "From Date", key: "from_date", type: "date" },
                { label: "To Date", key: "to_date", type: "date" },
                { label: "Reason", key: "reason" },
              ].map(({ label, key, type }) => (
                <div key={key} style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>{label}</label>
                  <input type={type || "text"} value={(leaveForm as any)[key]}
                    onChange={(e) => setLeaveForm({ ...leaveForm, [key]: e.target.value })}
                    style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", padding: "8px 12px", color: "#f8fafc", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Leave Type</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => {
                    setLeaveForm({ ...leaveForm, leave_type: e.target.value });
                    setMedicalVerification({ status: "", message: "", valid: null });
                  }}
                  style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", padding: "8px 12px", color: "#f8fafc", fontSize: "14px" }}>
                  <option value="MEDICAL">Medical</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="FAMILY">Family</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              {leaveForm.leave_type === "MEDICAL" && (
                <div style={{ marginBottom: "16px", background: "#0f172a", borderRadius: "8px", padding: "16px", border: "1px dashed #3b82f6" }}>
                  <label style={{ display: "block", fontSize: "13px", color: "#3b82f6", marginBottom: "8px", fontWeight: "bold" }}>
                    🏥 Medical Certificate (Required for Medical Leave)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleMedicalFileUpload}
                    style={{ width: "100%", color: "#94a3b8", fontSize: "13px", cursor: "pointer" }} />
                  {medicalVerification.status && (
                    <div style={{ marginTop: "10px", padding: "10px", borderRadius: "6px", fontSize: "13px", lineHeight: "1.5", background: medicalVerification.valid === true ? "#166534" : medicalVerification.valid === false ? "#7f1d1d" : "#1e3a5f" }}>
                      {medicalVerification.message}
                    </div>
                  )}
                  <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#64748b" }}>
                    Accepted formats: PDF, JPG, PNG. AI will verify your document automatically.
                  </p>
                </div>
              )}
              <button onClick={submitLeave}
                style={{ width: "100%", background: "#8b5cf6", color: "white", border: "none", borderRadius: "8px", padding: "12px", cursor: "pointer", fontSize: "15px", fontWeight: "bold" }}>
                Submit Leave Request
              </button>
            </div>
          </div>
        )}

        {/* MANAGE LEAVES TAB — ADMIN */}
        {activeTab === "manage" && (
          <div>
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px", border: "1px solid #334155" }}>
              <h2 style={{ margin: "0 0 20px", fontSize: "16px", color: "#f8fafc" }}>✅ Manage Leave Requests — Admin</h2>
              {leaveRequests.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>No leave requests yet.</p>
              ) : (
                leaveRequests.map((l) => (
                  <div key={l.id} style={{ background: "#0f172a", borderRadius: "8px", padding: "16px", marginBottom: "12px", border: "1px solid #334155" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontWeight: "bold", color: "#f8fafc" }}>{l.student_name}</span>
                      <span style={{ background: getStatusColor(l.status), color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "12px" }}>{l.status}</span>
                    </div>
                    <p style={{ margin: "4px 0", fontSize: "13px", color: "#94a3b8" }}>{l.leave_type} • {l.from_date} to {l.to_date}</p>
                    <p style={{ margin: "4px 0", fontSize: "13px", color: "#94a3b8" }}>Reason: {l.reason}</p>
                    <div style={{ background: "#1e293b", borderRadius: "6px", padding: "8px", margin: "8px 0", fontSize: "13px" }}>
                      <span style={{ color: "#f59e0b" }}>🤖 AI Recommendation: </span>
                      <span style={{ color: "#cbd5e1" }}>{l.ai_recommendation}</span>
                      <span style={{ color: "#94a3b8", marginLeft: "8px" }}>(Risk: {(l.ai_risk_score * 100).toFixed(0)}%)</span>
                    </div>
                    {l.status === "PENDING" && (
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <button onClick={() => updateLeaveStatus(l.id, "APPROVE")}
                          style={{ flex: 1, background: "#166534", color: "white", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer", fontSize: "13px" }}>
                          ✅ Approve
                        </button>
                        <button onClick={() => updateLeaveStatus(l.id, "REJECT")}
                          style={{ flex: 1, background: "#7f1d1d", color: "white", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer", fontSize: "13px" }}>
                          ❌ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* AI ANALYSIS TAB */}
        {activeTab === "analyze" && (
          <div style={{ maxWidth: "600px" }}>
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px", border: "1px solid #334155", marginBottom: "24px" }}>
              <h2 style={{ margin: "0 0 20px", fontSize: "16px", color: "#f8fafc" }}>🤖 AI Attendance Analysis</h2>
              <div style={{ display: "flex", gap: "12px" }}>
                <input value={analyzeId} onChange={(e) => setAnalyzeId(e.target.value)}
                  placeholder="Enter Student ID (e.g. STU001)"
                  style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", padding: "10px 12px", color: "#f8fafc", fontSize: "14px" }} />
                <button onClick={analyzeStudent}
                  style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", padding: "10px 20px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
                  Analyze
                </button>
              </div>
            </div>
            {analysisResult && (
              <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px", border: `1px solid ${getRiskColor(analysisResult.risk_level)}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#f8fafc" }}>{analysisResult.student_name}</h3>
                    <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "13px" }}>{analysisResult.student_id}</p>
                  </div>
                  <span style={{ background: getRiskColor(analysisResult.risk_level), color: "white", padding: "4px 12px", borderRadius: "6px", fontWeight: "bold" }}>
                    {analysisResult.risk_level}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                  <div style={{ background: "#0f172a", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 4px", color: "#94a3b8", fontSize: "12px" }}>ATTENDANCE</p>
                    <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: getRiskColor(analysisResult.risk_level) }}>
                      {analysisResult.overall_percentage}%
                    </p>
                  </div>
                  <div style={{ background: "#0f172a", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 4px", color: "#94a3b8", fontSize: "12px" }}>AT RISK</p>
                    <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: analysisResult.is_at_risk ? "#ef4444" : "#22c55e" }}>
                      {analysisResult.is_at_risk ? "YES" : "NO"}
                    </p>
                  </div>
                </div>
                <div style={{ background: "#0f172a", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
                  <p style={{ margin: "0 0 8px", color: "#f59e0b", fontSize: "13px", fontWeight: "bold" }}>🤖 AI Recommendation</p>
                  <p style={{ margin: 0, color: "#cbd5e1", fontSize: "14px", lineHeight: "1.5" }}>{analysisResult.ai_recommendation}</p>
                </div>
                <div style={{ background: "#0f172a", borderRadius: "8px", padding: "16px" }}>
                  <p style={{ margin: "0 0 8px", color: "#3b82f6", fontSize: "13px", fontWeight: "bold" }}>💡 Suggested Action</p>
                  <p style={{ margin: 0, color: "#cbd5e1", fontSize: "14px", lineHeight: "1.5" }}>{analysisResult.suggested_action}</p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "VND_002";
const CASE_NAME = "Jindal Steel - TMT Bar Supplier Registration";

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 4));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const updateProcessLog = (processId, logEntry, keyDetailsUpdate = {}) => {
    const processFile = path.join(PUBLIC_DATA_DIR, `process_${processId}.json`);
    let data = { logs: [], keyDetails: {}, sidebarArtifacts: [] };
    if (fs.existsSync(processFile)) data = readJson(processFile);
    if (logEntry) {
        const existingIdx = logEntry.id ? data.logs.findIndex(l => l.id === logEntry.id) : -1;
        if (existingIdx !== -1) { data.logs[existingIdx] = { ...data.logs[existingIdx], ...logEntry }; }
        else { data.logs.push(logEntry); }
    }
    if (keyDetailsUpdate && Object.keys(keyDetailsUpdate).length > 0) {
        data.keyDetails = { ...data.keyDetails, ...keyDetailsUpdate };
    }
    writeJson(processFile, data);
};

const updateProcessListStatus = async (processId, status, currentStatus) => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        const response = await fetch(`${apiUrl}/api/update-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: processId, status, currentStatus }) });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
    } catch (e) {
        try { const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8')); const idx = processes.findIndex(p => p.id === String(processId)); if (idx !== -1) { processes[idx].status = status; processes[idx].currentStatus = currentStatus; fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4)); } } catch (err) { }
    }
};

const waitForSignal = async (signalId) => {
    console.log(`Waiting for human signal: ${signalId}...`);
    const signalFile = path.join(__dirname, '../interaction-signals.json');
    for (let i = 0; i < 15; i++) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (!content) continue;
                const signals = JSON.parse(content);
                if (signals[signalId]) {
                    delete signals[signalId];
                    const tempSignal = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                    fs.writeFileSync(tempSignal, JSON.stringify(signals, null, 4));
                    fs.renameSync(tempSignal, signalFile);
                }
                break;
            }
        } catch (e) { await delay(Math.floor(Math.random() * 200) + 100); }
    }
    while (true) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (content) {
                    const signals = JSON.parse(content);
                    if (signals[signalId]) {
                        console.log(`Signal ${signalId} received!`);
                        delete signals[signalId];
                        const tempSignal = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                        fs.writeFileSync(tempSignal, JSON.stringify(signals, null, 4));
                        fs.renameSync(tempSignal, signalFile);
                        return true;
                    }
                }
            }
        } catch (e) { }
        await delay(1000);
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);
    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [], keyDetails: {
            vendorName: "Jindal Steel & Power Ltd",
            gstin: "04AABCJ1234R1ZP",
            pan: "AABCJ1234R",
            materialCategory: "Steel & TMT Bars",
            project: "Heritage Max, Sector 102, Gurgaon",
            applicationRef: "VRF-2025-0203",
            contactPerson: "Vikram Singh Rathore"
        }
    });

    const steps = [
        {
            id: "step-1", title_p: "Receiving vendor registration package...",
            title_s: "Vendor registration package received - Jindal Steel & Power",
            reasoning: ["Document: jindal_steel_vendor_application.pdf", "Application Reference: VRF-2025-0203", "Vendor: Jindal Steel & Power Limited", "Category: Steel & TMT Bars"],
            artifacts: [{ id: "art-reg", type: "file", label: "Jindal Steel Vendor Application", pdfPath: "/data/jindal_steel_vendor_application.pdf" }]
        },
        {
            id: "step-2", title_p: "Extracting vendor details from application...",
            title_s: "Vendor details extracted - GSTIN, PAN, banking details captured",
            reasoning: ["Company: Jindal Steel & Power Limited", "GSTIN: 04AABCJ1234R1ZP | PAN: AABCJ1234R", "Submitted address: Jindal Centre, 12 Bhikaiji Cama Place, New Delhi", "Supply address: Raipur Plant, Chhattisgarh", "Products: TMT Bars Fe-500D, Fe-550D, Structural Steel"]
        },
        {
            id: "step-3", title_p: "Validating GSTIN on GST portal...",
            title_s: "CRITICAL: GSTIN STATUS SUSPENDED - Address mismatch detected",
            reasoning: ["GSTIN 04AABCJ1234R1ZP queried on gst.gov.in", "STATUS: SUSPENDED since 15/11/2024", "Suspension reason: Non-filing of returns for consecutive periods", "Last return filed: GSTR-3B September 2024 (3 months overdue)", "REGISTERED ADDRESS: Village Patrapali, Raigarh, Chhattisgarh", "APPLICATION ADDRESS: Bhikaiji Cama Place, New Delhi", "ADDRESS MISMATCH: Chhattisgarh vs Delhi - DISCREPANCY FOUND"],
            artifacts: [
                { id: "art-gst", type: "json", label: "GST Mismatch Report", data: { gstin: "04AABCJ1234R1ZP", legal_name: "JINDAL STEEL & POWER LIMITED", status: "SUSPENDED", suspension_date: "15/11/2024", reason: "Non-filing of returns", registered_address: "Village Patrapali, Raigarh, Chhattisgarh - 496001", submitted_address: "Jindal Centre, 12 Bhikaiji Cama Place, New Delhi - 110066", address_match: false, flags: ["GSTIN Suspended", "Address Mismatch", "Returns Overdue"] } },
                { id: "art-gst-video", type: "video", label: "GST Portal - Suspended Status Recording", videoPath: "/data/vnd_002_gst_suspended.webm" }
            ]
        },
        {
            id: "step-4", title_p: "Running background check on vendor...",
            title_s: "Background check: Tax compliance notice found from Nov 2024",
            reasoning: ["Tax compliance notice issued by CGST Raigarh on 10/11/2024", "Reason: Failure to file GSTR-1 and GSTR-3B for Oct-Nov 2024", "No NCLT cases pending", "No criminal proceedings found", "Company is publicly listed (NSE: JINDALSTEL) - financials available"]
        },
        {
            id: "step-5", title_p: "Flagging discrepancies for procurement review...",
            title_s: "ACTION REQUIRED: GSTIN suspended, address mismatch - Approve manual re-verification or reject?",
            reasoning: ["Two critical issues found requiring human decision:", "1. GSTIN Status: SUSPENDED - vendor cannot issue valid GST invoices", "2. Address Mismatch: Application claims Delhi, GST shows Chhattisgarh", "3. Tax compliance notice active since November 2024", "Options: (A) Approve manual re-verification with updated documents, (B) Reject vendor application", "Note: Jindal Steel is a major supplier - rejection may impact project timeline"],
            artifacts: [{ id: "art-flags", type: "json", label: "Discrepancy Summary", data: { critical_flags: ["GSTIN Suspended", "Address Mismatch (Delhi vs Chhattisgarh)", "Tax Compliance Notice Active"], risk_level: "HIGH", impact: "Cannot issue valid GST invoices until resolved", recommendation: "Request updated GSTIN from Delhi/Haryana registration", timeline_risk: "Heritage Max project may face 2-week delay if vendor rejected" } }]
        },
        {
            id: "step-6", title_p: "Initiating manual re-verification with corrected documents...",
            title_s: "Re-verification initiated - Vendor providing updated Haryana GSTIN",
            reasoning: ["Procurement manager approved manual re-verification", "Vendor contacted and informed of GSTIN discrepancy", "Vendor confirms: Haryana unit has separate GSTIN (06AAHCJ5678R1ZN)", "Updated GSTIN provided for Manesar warehouse operations", "Re-verification in progress with corrected number"]
        },
        {
            id: "step-7", title_p: "Re-validating corrected GSTIN...",
            title_s: "Corrected GSTIN verified - 06AAHCJ5678R1ZN is ACTIVE in Haryana",
            reasoning: ["New GSTIN 06AAHCJ5678R1ZN queried on gst.gov.in", "Status: ACTIVE", "State: Haryana - matches project location", "Address: IMT Manesar, Gurgaon - verified", "Last return: GSTR-3B December 2024 (filed on time)", "Original suspended GSTIN was for Chhattisgarh plant - not relevant"]
        },
        {
            id: "step-8", title_p: "Generating conditional approval with review terms...",
            title_s: "Conditional approval granted - 90-day probationary period with quarterly review",
            reasoning: ["Vendor approved with conditions due to initial GSTIN discrepancy", "Condition 1: 90-day probationary review", "Condition 2: Quarterly GST filing verification", "Condition 3: First 3 invoices require manual cross-check", "Vendor code: VND-JSP-2025-0203 (Probationary)", "Risk score adjusted: 65/100 (MEDIUM) due to initial flags"],
            artifacts: [{ id: "art-approval", type: "json", label: "Conditional Approval Terms", data: { vendor: "Jindal Steel & Power Ltd", vendor_code: "VND-JSP-2025-0203", status: "PROBATIONARY", risk_score: 65, conditions: ["90-day probationary review", "Quarterly GST filing verification", "Manual cross-check on first 3 invoices", "Re-assessment at 90 days"], corrected_gstin: "06AAHCJ5678R1ZN", next_review: "April 12, 2025" } }]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isFinal = i === steps.length - 1;
        updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_p, status: "processing" });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2000);

        if (step.id === "step-5") {
            updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: "warning", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", step.title_s);
            await waitForSignal("APPROVE_REVERIFICATION");
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Approved: Proceeding with manual re-verification");
        } else {
            updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: isFinal ? "completed" : "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
            await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
            await delay(1500);
        }
    }
    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();

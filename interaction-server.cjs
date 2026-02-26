try { require('dotenv').config(); } catch(e) {}

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const VITE_MODEL = process.env.VITE_MODEL || 'gemini-2.5-flash';

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const KB_PATH = path.join(__dirname, 'src/data/knowledgeBase.md');
const FEEDBACK_QUEUE_PATH = path.join(__dirname, 'feedbackQueue.json');
const KB_VERSIONS_PATH = path.join(DATA_DIR, 'kbVersions.json');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');

// Initialize files
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

const baseProcesses = path.join(DATA_DIR, 'base_processes.json');
const processesFile = path.join(DATA_DIR, 'processes.json');
if (!fs.existsSync(processesFile) && fs.existsSync(baseProcesses)) {
    fs.copyFileSync(baseProcesses, processesFile);
}

const signalFile = path.join(__dirname, 'interaction-signals.json');
if (!fs.existsSync(signalFile)) {
    fs.writeFileSync(signalFile, JSON.stringify({ APPROVE_REVERIFICATION: false }, null, 4));
}
if (!fs.existsSync(FEEDBACK_QUEUE_PATH)) fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
if (!fs.existsSync(KB_VERSIONS_PATH)) fs.writeFileSync(KB_VERSIONS_PATH, '[]');

let state = { sent: false, confirmed: false, signals: {} };
const runningProcesses = new Map();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

const mimeTypes = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.webm': 'video/webm',
    '.mp4': 'video/mp4', '.woff': 'font/woff', '.woff2': 'font/woff2',
    '.ico': 'image/x-icon', '.md': 'text/markdown'
};

async function callGemini(messages, systemPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${VITE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const contents = [];
    if (systemPrompt) {
        contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
        contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
    }
    for (const msg of messages) {
        contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
    }
    const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } })
    });
    const data = await resp.json();
    if (data.candidates && data.candidates[0]) return data.candidates[0].content.parts[0].text;
    throw new Error('Gemini API error: ' + JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const cleanPath = url.pathname;

    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        return res.end();
    }

    // --- RESET ---
    if (cleanPath === '/reset') {
        state = { sent: false, confirmed: false, signals: {} };
        console.log('Demo Reset Triggered');
        fs.writeFileSync(signalFile, JSON.stringify({ APPROVE_REVERIFICATION: false }, null, 4));

        runningProcesses.forEach((proc, id) => { try { process.kill(-proc.pid, 'SIGKILL'); } catch (e) { } });
        runningProcesses.clear();

        exec('pkill -9 -f "node(.*)simulation_scripts" || true', (err) => {
            setTimeout(() => {
                const cases = [
                    { id: "VND_001", name: "UltraTech Cement - Cement Supplier Registration", category: "Vendor Onboarding", stockId: "VRF-2025-0187", year: new Date().toISOString().split('T')[0], status: "In Progress", currentStatus: "Initializing...", vendorName: "UltraTech Cement Ltd", materialCategory: "Cement & Concrete", project: "Elaira Residences, Sector 80" },
                    { id: "VND_002", name: "Jindal Steel - TMT Bar Supplier Registration", category: "Vendor Onboarding", stockId: "VRF-2025-0203", year: new Date().toISOString().split('T')[0], status: "In Progress", currentStatus: "Initializing...", vendorName: "Jindal Steel & Power Ltd", materialCategory: "Steel & TMT Bars", project: "Heritage Max, Sector 102" },
                    { id: "VND_003", name: "Daikin India - HVAC Contractor Registration", category: "Vendor Onboarding", stockId: "CRF-2025-0089", year: new Date().toISOString().split('T')[0], status: "In Progress", currentStatus: "Initializing...", vendorName: "Daikin Airconditioning India", materialCategory: "HVAC Systems", project: "PARQ, Sector 80" },
                    { id: "VND_004", name: "DesignCraft Interiors - Interior Fit-out Registration", category: "Vendor Onboarding", stockId: "VRF-2025-0215", year: new Date().toISOString().split('T')[0], status: "In Progress", currentStatus: "Initializing...", vendorName: "DesignCraft Interiors Pvt Ltd", materialCategory: "Interior Design & Fit-out", project: "Goa Luxury Villas, Candolim" }
                ];
                fs.writeFileSync(processesFile, JSON.stringify(cases, null, 4));
                fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
                fs.writeFileSync(KB_VERSIONS_PATH, '[]');

                // Clear old process files
                ['VND_001','VND_002','VND_003','VND_004'].forEach(id => {
                    const pf = path.join(DATA_DIR, `process_${id}.json`);
                    fs.writeFileSync(pf, JSON.stringify({ logs: [], keyDetails: {} }, null, 4));
                });

                const scripts = [
                    { file: 'vendor_story_1_happy_path.cjs', id: 'VND_001' },
                    { file: 'vendor_story_2_needs_attention.cjs', id: 'VND_002' },
                    { file: 'vendor_story_3_needs_attention.cjs', id: 'VND_003' },
                    { file: 'vendor_story_4_needs_review.cjs', id: 'VND_004' }
                ];
                let totalDelay = 0;
                scripts.forEach((script) => {
                    setTimeout(() => {
                        const scriptPath = path.join(__dirname, 'simulation_scripts', script.file);
                        const child = exec(`node "${scriptPath}" > "${scriptPath}.log" 2>&1`, (error) => {
                            if (error && error.code !== 0) console.error(`${script.file} error:`, error.message);
                            runningProcesses.delete(script.id);
                        });
                        runningProcesses.set(script.id, child);
                    }, totalDelay * 1000);
                    totalDelay += 2;
                });
            }, 1000);
        });
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // --- EMAIL STATUS ---
    if (cleanPath === '/email-status') {
        if (req.method === 'GET') {
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ sent: state.sent }));
        }
        if (req.method === 'POST') {
            let body = '';
            req.on('data', c => body += c);
            req.on('end', () => {
                try { const d = JSON.parse(body); state.sent = d.sent; } catch(e) {}
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            });
            return;
        }
    }

    // --- SIGNAL ---
    if (cleanPath === '/signal' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const d = JSON.parse(body);
                let signals = {};
                try { signals = JSON.parse(fs.readFileSync(signalFile, 'utf8')); } catch(e) {}
                signals[d.signal] = true;
                const tmp = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                fs.writeFileSync(tmp, JSON.stringify(signals, null, 4));
                fs.renameSync(tmp, signalFile);
            } catch(e) {}
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    if (cleanPath === '/signal-status' && req.method === 'GET') {
        let signals = {};
        try { signals = JSON.parse(fs.readFileSync(signalFile, 'utf8')); } catch(e) {}
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(signals));
    }

    // --- UPDATE STATUS ---
    if (cleanPath === '/api/update-status' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const d = JSON.parse(body);
                const processes = JSON.parse(fs.readFileSync(processesFile, 'utf8'));
                const idx = processes.findIndex(p => p.id === d.id);
                if (idx !== -1) {
                    processes[idx].status = d.status;
                    processes[idx].currentStatus = d.currentStatus;
                    fs.writeFileSync(processesFile, JSON.stringify(processes, null, 4));
                }
            } catch(e) {}
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    // --- CHAT (KB + Work-with-Pace) ---
    if (cleanPath === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body);
                let messages, systemPrompt;
                if (parsed.messages && parsed.systemPrompt) {
                    messages = parsed.messages;
                    systemPrompt = parsed.systemPrompt;
                } else {
                    const kb = parsed.knowledgeBase || '';
                    systemPrompt = `You are an AI assistant for Conscient Infrastructure's vendor onboarding process. Use the following knowledge base to answer questions:\n\n${kb}\n\nBe helpful, accurate, and concise.`;
                    messages = [];
                    if (parsed.history) {
                        for (const h of parsed.history) {
                            messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content });
                        }
                    }
                    messages.push({ role: 'user', content: parsed.message });
                }
                const response = await callGemini(messages, systemPrompt);
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response }));
            } catch(e) {
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // --- FEEDBACK QUESTIONS ---
    if (cleanPath === '/api/feedback/questions' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const { feedback, knowledgeBase } = JSON.parse(body);
                const prompt = `Based on this feedback about a knowledge base, generate exactly 3 clarifying questions to better understand the requested change.\n\nKnowledge Base:\n${knowledgeBase}\n\nFeedback:\n${feedback}\n\nReturn ONLY a JSON array of 3 question strings, like: ["Q1?", "Q2?", "Q3?"]`;
                const resp = await callGemini([{ role: 'user', content: prompt }], null);
                const match = resp.match(/\[[\s\S]*\]/);
                const questions = match ? JSON.parse(match[0]) : ["Could you clarify?", "What specific section?", "Any examples?"];
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ questions }));
            } catch(e) {
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // --- FEEDBACK SUMMARIZE ---
    if (cleanPath === '/api/feedback/summarize' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const { feedback, questions, answers, knowledgeBase } = JSON.parse(body);
                const prompt = `Summarize this feedback into a clear, actionable proposal for updating the knowledge base.\n\nOriginal feedback: ${feedback}\n\nClarifying Q&A:\n${questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join('\n\n')}\n\nKnowledge Base context:\n${knowledgeBase}\n\nProvide a concise summary of what should change.`;
                const summary = await callGemini([{ role: 'user', content: prompt }], null);
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ summary }));
            } catch(e) {
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // --- FEEDBACK QUEUE ---
    if (cleanPath === '/api/feedback/queue') {
        if (req.method === 'GET') {
            let queue = [];
            try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch(e) {}
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ queue }));
        }
        if (req.method === 'POST') {
            let body = '';
            req.on('data', c => body += c);
            req.on('end', () => {
                try {
                    const item = JSON.parse(body);
                    let queue = [];
                    try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch(e) {}
                    queue.push({ ...item, status: 'pending', timestamp: new Date().toISOString() });
                    fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));
                } catch(e) {}
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            });
            return;
        }
    }

    // --- FEEDBACK QUEUE DELETE ---
    if (cleanPath.startsWith('/api/feedback/queue/') && req.method === 'DELETE') {
        const feedbackId = cleanPath.split('/').pop();
        try {
            let queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8'));
            queue = queue.filter(item => item.id !== feedbackId);
            fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));
        } catch(e) {}
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // --- FEEDBACK APPLY ---
    if (cleanPath === '/api/feedback/apply' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const { feedbackId } = JSON.parse(body);
                let queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8'));
                const item = queue.find(i => i.id === feedbackId);
                if (!item) throw new Error('Feedback item not found');

                const currentKB = fs.readFileSync(KB_PATH, 'utf8');
                const prompt = `Update the following knowledge base based on this feedback. Return ONLY the updated knowledge base content, no explanations.\n\nCurrent Knowledge Base:\n${currentKB}\n\nFeedback to apply:\n${item.summary}\n\nReturn the complete updated knowledge base:`;
                const updatedKB = await callGemini([{ role: 'user', content: prompt }], null);

                // Save snapshots
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const prevFile = `kb_before_${timestamp}.md`;
                const snapFile = `kb_after_${timestamp}.md`;
                fs.writeFileSync(path.join(SNAPSHOTS_DIR, prevFile), currentKB);
                fs.writeFileSync(path.join(SNAPSHOTS_DIR, snapFile), updatedKB);
                fs.writeFileSync(KB_PATH, updatedKB);

                // Update versions
                let versions = [];
                try { versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8')); } catch(e) {}
                versions.push({
                    id: versions.length + 1,
                    timestamp: new Date().toISOString(),
                    snapshotFile: snapFile,
                    previousFile: prevFile,
                    changes: [item.summary]
                });
                fs.writeFileSync(KB_VERSIONS_PATH, JSON.stringify(versions, null, 4));

                // Update queue
                queue = queue.filter(i => i.id !== feedbackId);
                fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));

                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, content: updatedKB }));
            } catch(e) {
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // --- KB CONTENT ---
    if (cleanPath === '/api/kb/content' && req.method === 'GET') {
        const versionId = url.searchParams.get('versionId');
        let content = '';
        try {
            if (versionId) {
                const versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8'));
                const version = versions.find(v => v.id === parseInt(versionId));
                if (version) {
                    content = fs.readFileSync(path.join(SNAPSHOTS_DIR, version.snapshotFile), 'utf8');
                }
            } else {
                content = fs.readFileSync(KB_PATH, 'utf8');
            }
        } catch(e) {}
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ content }));
    }

    // --- KB VERSIONS ---
    if (cleanPath === '/api/kb/versions' && req.method === 'GET') {
        let versions = [];
        try { versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8')); } catch(e) {}
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ versions }));
    }

    // --- KB SNAPSHOT ---
    if (cleanPath.startsWith('/api/kb/snapshot/') && req.method === 'GET') {
        const filename = cleanPath.split('/').pop();
        const snapPath = path.join(SNAPSHOTS_DIR, filename);
        try {
            const content = fs.readFileSync(snapPath, 'utf8');
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/markdown' });
            return res.end(content);
        } catch(e) {
            res.writeHead(404, corsHeaders);
            return res.end('Not found');
        }
    }

    // --- KB UPDATE ---
    if (cleanPath === '/api/kb/update' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const { content } = JSON.parse(body);
                fs.writeFileSync(KB_PATH, content);
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch(e) {
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // --- DEBUG ---
    if (cleanPath === '/debug-paths') {
        const info = { dataDir: DATA_DIR, exists: fs.existsSync(DATA_DIR), files: fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : [] };
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(info));
    }

    // --- STATIC FILES ---
    let filePath = path.join(PUBLIC_DIR, cleanPath === '/' ? 'index.html' : cleanPath);
    if (!fs.existsSync(filePath) && !path.extname(filePath)) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    try {
        const stat = fs.statSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        if (ext === '.webm' || ext === '.mp4' || ext === '.pdf') {
            const range = req.headers.range;
            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
                res.writeHead(206, { ...corsHeaders, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': contentType });
                fs.createReadStream(filePath, { start, end }).pipe(res);
            } else {
                res.writeHead(200, { ...corsHeaders, 'Content-Length': stat.size, 'Content-Type': contentType, 'Accept-Ranges': 'bytes' });
                fs.createReadStream(filePath).pipe(res);
            }
        } else {
            const content = fs.readFileSync(filePath);
            res.writeHead(200, { ...corsHeaders, 'Content-Type': contentType });
            res.end(content);
        }
    } catch(e) {
        res.writeHead(404, corsHeaders);
        res.end('Not found');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Conscient Vendor Onboarding Demo server running on port ${PORT}`);
});

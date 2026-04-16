axios.defaults.baseURL = 'http://localhost:3000';

const token = localStorage.getItem('token');
if(token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

let currentDocs = [];
let currentViewingId = null;

async function loadDashboard() {
    try {
        const userInfoRes = await axios.get('/api/auth/me');
        const user = userInfoRes.data.user;
        document.getElementById('userEmail').innerText = user.email;
        
        const subStat = document.getElementById('subStatus');
        subStat.innerText = user.subscription_status.toUpperCase();
        if(user.subscription_status === 'expired') {
            subStat.classList.add('expired-badge');
            // Force show subscription modal if expired
            showSubscriptionModal();
        }

        loadHistory();
        checkPaymentRedirect();

    } catch (err) {
        if (err.response && err.response.status === 401) logout();
    }
}

async function loadHistory() {
    try {
        const res = await axios.get('/api/nlp/history');
        currentDocs = res.data.history;
        renderHistoryList();
    } catch(err) {
        console.error(err);
    }
}

function renderHistoryList() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    currentDocs.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerText = doc.filename.length > 25 ? doc.filename.substring(0, 22) + '...' : doc.filename;
        div.onclick = () => viewDocument(doc.id);
        list.appendChild(div);
    });
}

function showLoading(text) {
    document.getElementById('loadingText').innerText = text;
    document.getElementById('loadingOverlay').style.display = 'flex';
}
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if(file) {
        const dropZone = document.getElementById('dropZone');
        dropZone.querySelector('h4').innerText = "File selected: " + file.name;
        dropZone.style.borderColor = 'var(--primary)';
        dropZone.style.background = 'rgba(79, 70, 229, 0.05)';
        document.getElementById('textInput').value = ""; // clear text if file selected
    }
}

async function submitNotes() {
    const fileInput = document.getElementById('fileInput');
    const textInput = document.getElementById('textInput');
    const errorEl = document.getElementById('uploadError');
    errorEl.classList.add('hidden');

    if(!fileInput.files[0] && !textInput.value.trim()) {
        errorEl.classList.remove('hidden');
        errorEl.innerText = "Please upload a PDF or paste text.";
        return;
    }

    const formData = new FormData();
    if(fileInput.files[0]) {
        formData.append('file', fileInput.files[0]);
    } else {
        formData.append('text', textInput.value);
    }

    showLoading("Extracting & processing AI notes...");
    try {
        const res = await axios.post('/api/nlp/process', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        // Add to history and view
        currentDocs.unshift({...res.data.data, audio_url: null});
        renderHistoryList();
        viewDocument(res.data.data.id);
        
        // Reset inputs
        fileInput.value = "";
        textInput.value = "";
        document.getElementById('dropZone').querySelector('h4').innerText = "Click or drag PDF here";

    } catch (err) {
        errorEl.classList.remove('hidden');
        errorEl.innerText = err.response?.data?.message || "Failed to process notes.";
    } finally {
        hideLoading();
    }
}

function viewDocument(id) {
    currentViewingId = id;
    const doc = currentDocs.find(d => d.id === id);
    if(!doc) return;

    document.getElementById('uploadView').classList.add('hidden');
    document.getElementById('subView').classList.add('hidden');
    document.getElementById('resultView').classList.remove('hidden');

    document.getElementById('resFilename').innerText = doc.filename;

    // Render Explanation
    document.getElementById('tab-explanation').innerHTML = `<p>${doc.explanation.replace(/\n}/g, '<br>')}</p>`;

    // Render Key Points
    const kpList = Array.isArray(doc.keyPoints) ? doc.keyPoints : doc.key_points; // depends if from history or newly created
    const ul = document.createElement('ul');
    ul.style.listStyleType = 'disc';
    ul.style.paddingLeft = '20px';
    kpList.forEach(kp => {
        const li = document.createElement('li');
        li.innerText = kp;
        li.style.marginBottom = '10px';
        ul.appendChild(li);
    });
    document.getElementById('tab-keypoints').innerHTML = '';
    document.getElementById('tab-keypoints').appendChild(ul);

    // Render Exam QA
    const qaList = Array.isArray(doc.examQA) ? doc.examQA : doc.exam_qa;
    let qaHtml = "";
    qaList.forEach((qa, idx) => {
        qaHtml += `
            <div style="margin-bottom: 1.5rem; background: rgba(0,0,0,0.1); padding: 1rem; border-radius: 8px;">
                <strong>Q${idx+1}: ${qa.question}</strong>
                <p style="margin-top: 0.5rem; color: var(--text-muted);">${qa.answer}</p>
            </div>
        `;
    });
    document.getElementById('tab-examqa').innerHTML = qaHtml;

    // Audio Section Handle
    const audioContainer = document.getElementById('audioPlayerContainer');
    if (doc.audio_url) {
        audioContainer.innerHTML = `<audio controls src="${doc.audio_url}" autoplay></audio>`;
    } else {
        audioContainer.innerHTML = `<button class="btn btn-primary" style="font-size: 0.9rem;" onclick="generateAudioForCurrent()">Generate Audio Format</button>`;
        // Note we save the script from API so we can pass it if it's new
        window.tempAudioScript = doc.audioScript || doc.explanation;
    }

    switchTab('explanation');
}

async function generateAudioForCurrent() {
    const errorEl = document.getElementById('uploadError'); // reuse
    showLoading("Generating AI voice... (Can take ~20s)");
    try {
        const res = await axios.post('/api/nlp/audio', {
            uploadId: currentViewingId,
            script: window.tempAudioScript
        });
        
        // Update local doc state
        const docIndex = currentDocs.findIndex(d => d.id === currentViewingId);
        if(docIndex > -1) {
            currentDocs[docIndex].audio_url = res.data.url;
            document.getElementById('audioPlayerContainer').innerHTML = `<audio controls src="${res.data.url}" autoplay></audio>`;
        }
    } catch (err) {
        alert(err.response?.data?.message || "Failed to generate audio.");
        if (err.response?.status === 403) showSubscriptionModal();
    } finally {
        hideLoading();
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
}

function showUploadView() {
    document.getElementById('resultView').classList.add('hidden');
    document.getElementById('subView').classList.add('hidden');
    document.getElementById('accountView').classList.add('hidden');
    document.getElementById('uploadView').classList.remove('hidden');
}

function showSubscriptionModal() {
    document.getElementById('uploadView').classList.add('hidden');
    document.getElementById('resultView').classList.add('hidden');
    document.getElementById('accountView').classList.add('hidden');
    document.getElementById('subView').classList.remove('hidden');
}

async function showAccountView() {
    document.getElementById('uploadView').classList.add('hidden');
    document.getElementById('resultView').classList.add('hidden');
    document.getElementById('subView').classList.add('hidden');
    document.getElementById('accountView').classList.remove('hidden');

    try {
        const infoRes = await axios.get('/api/auth/me');
        const user = infoRes.data.user;
        const planText = user.subscription_plan ? (user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1)) : 'Trial';
        const expiry = user.subscription_end ? new Date(user.subscription_end).toLocaleDateString() : 'N/A';
        
        document.getElementById('accPlanName').innerText = planText;
        document.getElementById('accExpiry').innerText = `Expires: ${expiry} (${user.subscription_status.toUpperCase()})`;
        document.getElementById('accDocsCount').innerText = user.uploads_count || 0;
        if(document.getElementById('profileEmail')) document.getElementById('profileEmail').value = user.email;

        const histRes = await axios.get('/api/payment/history');
        const tbody = document.getElementById('paymentHistoryTable');
        tbody.innerHTML = '';
        if (histRes.data.history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 1rem; text-align: center; color: var(--text-muted);">No payment history found.</td></tr>';
            return;
        }

        histRes.data.history.forEach(tx => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            tr.innerHTML = `
                <td style="padding: 1rem;">${new Date(tx.created_at).toLocaleDateString()}</td>
                <td style="padding: 1rem; font-family: monospace; font-size: 0.85rem;">${tx.tx_ref}</td>
                <td style="padding: 1rem; font-weight: bold;">${tx.currency} ${tx.amount}</td>
                <td style="padding: 1rem;">
                    <span style="padding: 0.2rem 0.5rem; border-radius: 4px; background: rgba(255,255,255,0.05); font-size: 0.8rem; color: ${tx.status==='successful' ? '#10b981' : (tx.status==='failed' ? '#ef4444' : '#f59e0b')}">
                        ${tx.status.toUpperCase()}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Failed to load account view", err);
    }
}

async function initPayment(plan) {
    try {
        showLoading("Initializing payment portal...");
        const res = await axios.post('/api/payment/initialize', { plan });
        if(res.data.url) {
            window.location.href = res.data.url;
        }
    } catch(err) {
        alert("Failed to initialize payment.");
    } finally {
        hideLoading();
    }
}

async function updatePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const errEl = document.getElementById('passwordError');
    const succEl = document.getElementById('passwordSuccess');
    
    errEl.classList.add('hidden');
    succEl.classList.add('hidden');

    if (!currentPassword || !newPassword) {
        errEl.innerText = "Please fill in all fields.";
        errEl.classList.remove('hidden');
        return;
    }

    try {
        const res = await axios.post('/api/auth/update-password', {
            currentPassword,
            newPassword
        });
        succEl.innerText = res.data.message;
        succEl.classList.remove('hidden');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
    } catch(err) {
        errEl.innerText = err.response?.data?.message || "Failed to update password.";
        errEl.classList.remove('hidden');
    }
}

// Check if user just returned from Paystack payment gateway
async function checkPaymentRedirect() {
    const params = new URLSearchParams(window.location.search);
    if(params.get('payment') === 'verify' && params.has('reference')) {
        showLoading("Verifying your subscription...");
        try {
            const res = await axios.get(`/api/payment/verify?reference=${params.get('reference')}`);
            alert(res.data.message);
            // clear URL params
            window.history.replaceState({}, document.title, "/dashboard.html");
            window.location.reload();
        } catch(err) {
            alert("Payment verification failed. Please contact support.");
            window.history.replaceState({}, document.title, "/dashboard.html");
            hideLoading();
        }
    }
}

if(window.location.pathname.includes('dashboard.html')) {
    loadDashboard();
}

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
    document.getElementById('uploadView').classList.remove('hidden');
}

function showSubscriptionModal() {
    document.getElementById('uploadView').classList.add('hidden');
    document.getElementById('resultView').classList.add('hidden');
    document.getElementById('subView').classList.remove('hidden');
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

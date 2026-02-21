// ============================================
// KARTING DASHBOARD v4.0
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyBGSE2GfzcdftqmWKdJp_gOAqwFpxLTaQs",
    authDomain: "karting-95b36.firebaseapp.com",
    projectId: "karting-95b36",
    storageBucket: "karting-95b36.firebasestorage.app",
    messagingSenderId: "156441842966",
    appId: "1:156441842966:web:980d7093b0ca0296a1ec37"
};

let auth, db;
try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log('✅ Firebase OK');
} catch(e) { console.error('❌ Firebase:', e); }

// ============================================
// VARIABLES GLOBALES UI
// ============================================

let deferredPrompt = null;

// PWA Install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(() => {
        if (window.dashboard) {
            dashboard.setPwaInstructions();
        }
    }, 1000);
});

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const btn = document.getElementById('installBtn');
    if (btn) btn.style.display = 'none';
    showNotifGlobal('App installée ! 🎉');
});

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((result) => {
            if (result.outcome === 'accepted') showNotifGlobal('Installation réussie ! 🚀');
            deferredPrompt = null;
        });
    }
}

// Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(() => console.log('✅ Service Worker actif'))
            .catch(e => console.log('SW non disponible (local):', e.message));
    });
}

// ============================================
// FONCTIONS GLOBALES MODALS
// ============================================

let authMode = true; // true = login, false = signup

function showModal(id) { document.getElementById(id).style.display = 'flex'; }
function hideModal(id) { document.getElementById(id).style.display = 'none'; }

function toggleAuthMode() {
    authMode = !authMode;
    document.getElementById('authSubmitBtn').textContent = authMode ? 'Se connecter' : 'Créer un compte';
    document.getElementById('authToggleBtn').textContent = authMode ? 'Créer un compte' : "J'ai déjà un compte";
}

async function handleEmailAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || !password) { showNotifGlobal('Remplissez email et mot de passe', 'error'); return; }
    try {
        if (authMode) {
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            await auth.createUserWithEmailAndPassword(email, password);
        }
    } catch(e) {
        let msg = 'Erreur de connexion';
        if (e.code === 'auth/user-not-found') msg = 'Compte introuvable';
        else if (e.code === 'auth/wrong-password') msg = 'Mot de passe incorrect';
        else if (e.code === 'auth/email-already-in-use') msg = 'Email déjà utilisé';
        else if (e.code === 'auth/weak-password') msg = 'Mot de passe trop court (6 min)';
        else if (e.code === 'auth/invalid-email') msg = 'Email invalide';
        showNotifGlobal(msg, 'error');
    }
}

function showCGU() { showModal('cguModal'); }
function closeCGU() { hideModal('cguModal'); }
function showFAQ() { showModal('faqModal'); }
function closeFAQ() { hideModal('faqModal'); }
function closeRecord() { document.getElementById('recordPopup').style.display = 'none'; }
function showNotifGlobal(msg, type) { if (window.dashboard) dashboard.showNotification(msg, type); }

// ============================================
// PROFIL MODAL - SAUVEGARDE DIRECTE FIREBASE
// ============================================

async function saveProfileModal() {
    const name = document.getElementById('regPilotName').value.trim();
    const kart = document.getElementById('regKartType').value.trim();
    const engine = document.getElementById('regKartEngine').value.trim();
    const cgu = document.getElementById('regCGU').checked;
    const errEl = document.getElementById('profileError');

    errEl.style.display = 'none';

    if (!name || !kart || !engine) {
        errEl.textContent = '⚠️ Veuillez remplir tous les champs obligatoires (*)';
        errEl.style.display = 'block';
        return;
    }
    if (!cgu) {
        errEl.textContent = "⚠️ Veuillez accepter les conditions d'utilisation";
        errEl.style.display = 'block';
        return;
    }

    const btn = document.getElementById('saveProfileBtn');
    btn.textContent = '⏳ Enregistrement...';
    btn.disabled = true;

    const user = auth.currentUser;
    if (!user) {
        errEl.textContent = '❌ Erreur: non connecté';
        errEl.style.display = 'block';
        btn.textContent = '✅ Commencer';
        btn.disabled = false;
        return;
    }

    const profile = {
        pilotName: name,
        kartType: kart,
        kartEngine: engine,
        email: user.email || '',
        cguAccepted: true,
        cguDate: new Date().toISOString()
    };

    try {
        await db.collection('users').doc(user.uid).collection('profile').doc('data').set(profile);
        console.log('✅ Profil sauvegardé Firebase');

        dashboard.profile = profile;
        dashboard.displayProfile();
        hideModal('profileModal');
        document.getElementById('appContainer').style.display = 'block';
        dashboard.showNotification('Bienvenue ' + name + ' ! 🏎️', 'success');
    } catch(e) {
        console.error('❌ Erreur Firebase:', e);
        errEl.textContent = '❌ Erreur sauvegarde: ' + e.message;
        errEl.style.display = 'block';
    }

    btn.textContent = '✅ Commencer';
    btn.disabled = false;
}

// ============================================
// CLASSE PRINCIPALE
// ============================================

class KartingDashboard {
    constructor() {
        this.sessions = [];
        this.circuits = [];
        this.profile = { pilotName: '', kartType: '', kartEngine: '' };
        this.theme = { mode: localStorage.getItem('themeMode') || 'dark' };
        this.circuitCharts = {};
        this.editingId = null;
        this.selectedCircuit = 'all';
        this.currentUser = null;
        this.isInitialized = false;
        this.init();
    }

    init() {
        this.applyTheme();
        this.setupAuth();
        this.setupEventListeners();
    }

    // ── AUTH ──────────────────────────────────────────────────────────────

    setupAuth() {
        auth.onAuthStateChanged(user => {
            this.currentUser = user;
            if (user) {
                console.log('✅ Connecté:', user.email);
                hideModal('authModal');
                this.loadFromFirebase();
            } else {
                document.getElementById('appContainer').style.display = 'none';
                showModal('authModal');
            }
        });
    }

    // ── FIREBASE ──────────────────────────────────────────────────────────

    async loadFromFirebase() {
        if (!this.currentUser || !db) return;
        const uid = this.currentUser.uid;

        try {
            // Charger profil
            const profileDoc = await db.collection('users').doc(uid).collection('profile').doc('data').get();

            if (!profileDoc.exists || !profileDoc.data().pilotName) {
                console.log('👶 Premier lancement - affichage profil obligatoire');
                document.getElementById('regEmail').value = this.currentUser.email || '';
                document.getElementById('appContainer').style.display = 'none';
                showModal('profileModal');
                return;
            }

            this.profile = profileDoc.data();
            console.log('✅ Profil chargé:', this.profile.pilotName);

            // Charger sessions
            const sessSnap = await db.collection('users').doc(uid).collection('sessions').get();
            this.sessions = [];
            sessSnap.forEach(doc => this.sessions.push(doc.data()));
            console.log('✅ Sessions chargées:', this.sessions.length);

            // Charger circuits
            const circDoc = await db.collection('users').doc(uid).collection('settings').doc('circuits').get();
            if (circDoc.exists) {
                this.circuits = circDoc.data().list || [];
            } else {
                this.circuits = ['Mariembourg', 'Genk', 'Spa'];
                await this.saveCircuitsFirebase();
            }

            // Afficher app
            document.getElementById('appContainer').style.display = 'block';
            this.isInitialized = true;
            this.displayProfile();
            this.populateCircuits();
            this.populateCircuitFilter();
            this.updateDashboard();
            this.setTodayDate();
            this.setCurrentTime();

            // Email dans réglages
            const emailEl = document.getElementById('settingsUserEmail');
            if (emailEl) emailEl.textContent = '📧 ' + (this.currentUser.email || '');

            // Instructions PWA selon plateforme
            this.setPwaInstructions();

            this.showNotification('Données synchronisées ✅', 'success');

        } catch(e) {
            console.error('❌ Erreur chargement Firebase:', e);
            this.showNotification('Erreur de connexion', 'error');
        }
    }

    async saveSessionFirebase(session) {
        if (!this.currentUser || !db) return;
        await db.collection('users').doc(this.currentUser.uid).collection('sessions').doc(String(session.id)).set(session);
    }

    async deleteSessionFirebase(id) {
        if (!this.currentUser || !db) return;
        await db.collection('users').doc(this.currentUser.uid).collection('sessions').doc(String(id)).delete();
    }

    async saveCircuitsFirebase() {
        if (!this.currentUser || !db) return;
        await db.collection('users').doc(this.currentUser.uid).collection('settings').doc('circuits').set({ list: this.circuits });
    }

    async saveProfileFirebase() {
        if (!this.currentUser || !db) return;
        await db.collection('users').doc(this.currentUser.uid).collection('profile').doc('data').set(this.profile);
    }

    // ── PROFIL SETTINGS ───────────────────────────────────────────────────

    saveProfileSettings() {
        const name = document.getElementById('pilotName').value.trim();
        const kart = document.getElementById('kartType').value.trim();
        const engine = document.getElementById('kartEngine').value.trim();
        if (!name || !kart || !engine) {
            this.showNotification('Remplissez tous les champs', 'error'); return;
        }
        this.profile.pilotName = name;
        this.profile.kartType = kart;
        this.profile.kartEngine = engine;
        this.displayProfile();
        this.saveProfileFirebase()
            .then(() => this.showNotification('Profil sauvegardé ! 💾', 'success'))
            .catch(() => this.showNotification('Erreur sauvegarde', 'error'));
    }

    displayProfile() {
        const nameEl = document.getElementById('headerPilotName');
        if (nameEl) {
            nameEl.textContent = (this.profile.pilotName || '-') + ' - ' + (this.profile.kartType || '') + ' - ' + (this.profile.kartEngine || '');
            nameEl.style.fontStyle = 'italic';
        }
        const pn = document.getElementById('pilotName');
        const pk = document.getElementById('kartType');
        const pe = document.getElementById('kartEngine');
        if (pn) pn.value = this.profile.pilotName || '';
        if (pk) pk.value = this.profile.kartType || '';
        if (pe) pe.value = this.profile.kartEngine || '';
    }

    // ── SESSIONS ──────────────────────────────────────────────────────────

    addSession() {
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const circuit = document.getElementById('circuit').value;
        const bestTime = parseFloat(document.getElementById('bestTime').value);
        const lapsCount = parseInt(document.getElementById('lapsCount').value) || 0;
        const maxLaps = document.getElementById('maxLaps').value ? parseInt(document.getElementById('maxLaps').value) : null;
        const crownUsed = document.getElementById('crownUsed').value || '';
        const weather = document.getElementById('weather').value || '';
        const temperature = document.getElementById('temperature').value || '';
        const tireType = document.getElementById('tireType').value || '';
        const tirePressure = document.getElementById('tirePressure').value || '';
        const notes = document.getElementById('notes').value || '';

        if (!date || !circuit || isNaN(bestTime)) {
            this.showNotification('Remplissez les champs obligatoires', 'error'); return;
        }

        if (this.editingId) {
            const s = this.sessions.find(s => s.id === this.editingId);
            if (s) {
                Object.assign(s, { date, time, circuit, bestTime, lapsCount, maxLaps, crownUsed, weather, temperature, tireType, tirePressure, notes });
                this.saveSessionFirebase(s);
                this.showNotification('Session modifiée ✏️');
                this.editingId = null;
                document.getElementById('submitBtn').textContent = '📊 Enregistrer la session';
                document.getElementById('cancelEditBtn').style.display = 'none';
            }
        } else {
            const isRecord = this.checkIfNewRecord(circuit, bestTime);
            const session = { id: Date.now(), date, time, circuit, bestTime, lapsCount, maxLaps, crownUsed, weather, temperature, tireType, tirePressure, notes };
            this.sessions.push(session);
            this.saveSessionFirebase(session);
            if (isRecord) {
                this.showRecordPopup(circuit, bestTime);
            } else {
                this.showNotification('Session ajoutée ! 🏁');
            }
        }

        this.updateDashboard();
        this.populateCircuitFilter();
        this.clearForm();
        this.switchView('dashboard');
    }

    checkIfNewRecord(circuit, newTime) {
        const circuitSessions = this.sessions.filter(s => s.circuit === circuit);
        if (circuitSessions.length === 0) return true;
        return newTime < Math.min(...circuitSessions.map(s => s.bestTime));
    }

    showRecordPopup(circuit, time) {
        document.getElementById('recordCircuit').textContent = '🏎️ ' + circuit;
        document.getElementById('recordTime').textContent = this.formatTime(time);
        document.getElementById('recordPopup').style.display = 'flex';
        setTimeout(() => closeRecord(), 6000);
    }

    editSession(id) {
        const s = this.sessions.find(s => s.id === id);
        if (!s) return;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('date', s.date); setVal('time', s.time); setVal('circuit', s.circuit);
        setVal('bestTime', s.bestTime); setVal('lapsCount', s.lapsCount);
        setVal('maxLaps', s.maxLaps); setVal('crownUsed', s.crownUsed);
        setVal('weather', s.weather); setVal('temperature', s.temperature);
        setVal('tireType', s.tireType); setVal('tirePressure', s.tirePressure);
        setVal('notes', s.notes);
        this.editingId = id;
        document.getElementById('submitBtn').textContent = '✏️ Enregistrer les modifications';
        document.getElementById('cancelEditBtn').style.display = 'block';
        this.switchView('add-session');
        window.scrollTo(0, 0);
    }

    async deleteSession(id) {
        if (!confirm('Supprimer cette session ?')) return;
        this.sessions = this.sessions.filter(s => s.id !== id);
        await this.deleteSessionFirebase(id);
        this.updateDashboard();
        this.populateCircuitFilter();
        this.showNotification('Session supprimée', 'error');
    }

    cancelEdit() {
        this.editingId = null;
        this.clearForm();
        this.switchView('dashboard');
    }

    clearForm() {
        const form = document.getElementById('sessionForm');
        if (form) form.reset();
        this.setTodayDate();
        this.setCurrentTime();
        this.editingId = null;
        const sb = document.getElementById('submitBtn');
        if (sb) sb.textContent = '📊 Enregistrer la session';
        const cb = document.getElementById('cancelEditBtn');
        if (cb) cb.style.display = 'none';
    }

    showSessionDetails(id) {
        const s = this.sessions.find(s => s.id === id);
        if (!s) return;
        const rows = [
            ['📅 Date', this.formatDate(s.date)],
            ['🕐 Heure', s.time || '-'],
            ['🏁 Circuit', s.circuit],
            ['⏱️ Meilleur temps', this.formatTime(s.bestTime)],
            ['🔢 Tours', s.lapsCount || '-'],
            ['🏎️ Tours moteur', s.maxLaps || '-'],
            ['⚙️ Couronne', s.crownUsed || '-'],
            ['🌦️ Météo', s.weather || '-'],
            ['🌡️ Température', s.temperature ? s.temperature + '°C' : '-'],
            ['🛞 Pneus', s.tireType || '-'],
            ['⚡ Pression', s.tirePressure ? s.tirePressure + ' bar' : '-'],
            ['📝 Notes', s.notes || '-']
        ];
        document.getElementById('sessionDetailsContent').innerHTML =
            rows.map(([l, v]) => `<div class="session-detail-row"><span class="session-detail-label">${l}</span><span class="session-detail-value">${v}</span></div>`).join('');
        showModal('sessionModal');
    }

    closeSessionDetails() { hideModal('sessionModal'); }

    // ── CIRCUITS ──────────────────────────────────────────────────────────

    populateCircuits() {
        const sel = document.getElementById('circuit');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Sélectionnez --</option>';
        [...this.circuits].sort().forEach(c => {
            const o = document.createElement('option');
            o.value = o.textContent = c;
            sel.appendChild(o);
        });
    }

    populateCircuitFilter() {
        const sel = document.getElementById('circuitFilter');
        if (!sel) return;
        const val = sel.value;
        sel.innerHTML = '<option value="all">Tous les circuits</option>';
        [...new Set(this.sessions.map(s => s.circuit))].sort().forEach(c => {
            const o = document.createElement('option');
            o.value = o.textContent = c;
            sel.appendChild(o);
        });
        if (val) sel.value = val;
    }

    filterCircuit(val) {
        this.selectedCircuit = val;
        this.updateCircuitsAnalysis();
    }

    addNewCircuit() {
        const name = prompt('Nom du circuit :');
        if (!name || !name.trim()) return;
        const n = name.trim();
        if (this.circuits.includes(n)) { alert('Circuit déjà existant !'); return; }
        this.circuits.push(n);
        this.saveCircuitsFirebase();
        this.populateCircuits();
        const sel = document.getElementById('circuit');
        if (sel) sel.value = n;
        this.showNotification('Circuit "' + n + '" ajouté ! 🏁');
    }

    // ── DASHBOARD ─────────────────────────────────────────────────────────

    updateDashboard() {
        this.updateStats();
        this.updateRecentSessions();
        this.updateCircuitsAnalysis();
        this.displaySessions();
    }

    updateStats() {
        const total = this.sessions.length;
        document.getElementById('dashTotalSessions').textContent = total;

        if (total === 0) {
            document.getElementById('dashFavoriteCircuit').textContent = '-';
            document.getElementById('dashFavoriteCircuitBest').textContent = 'Circuit favori';
            document.getElementById('dashCircuitsCount').textContent = '0';
            document.getElementById('dashTotalLaps').textContent = '0';
            return;
        }

        const byCircuit = {};
        this.sessions.forEach(s => {
            if (!byCircuit[s.circuit]) byCircuit[s.circuit] = { laps: 0, best: Infinity };
            byCircuit[s.circuit].laps += s.lapsCount || 0;
            if (s.bestTime < byCircuit[s.circuit].best) byCircuit[s.circuit].best = s.bestTime;
        });

        const fav = Object.keys(byCircuit).reduce((a, b) => byCircuit[a].laps >= byCircuit[b].laps ? a : b);
        document.getElementById('dashFavoriteCircuit').textContent = fav;
        document.getElementById('dashFavoriteCircuitBest').textContent = 'Meilleur: ' + this.formatTime(byCircuit[fav].best);
        document.getElementById('dashCircuitsCount').textContent = Object.keys(byCircuit).length;
        document.getElementById('dashTotalLaps').textContent = this.sessions.reduce((s, x) => s + (x.lapsCount || 0), 0);
    }

    updateRecentSessions() {
        const el = document.getElementById('recentSessionsList');
        if (!el) return;
        if (this.sessions.length === 0) {
            el.innerHTML = '<div class="empty-state"><p>🏎️ Aucune session<br><small>Commencez par ajouter une session !</small></p></div>';
            return;
        }
        const recent = [...this.sessions]
            .sort((a, b) => new Date(b.date + ' ' + (b.time || '')) - new Date(a.date + ' ' + (a.time || '')))
            .slice(0, 10);
        el.innerHTML = recent.map(s => this.sessionItemHTML(s, false)).join('');
    }

    updateCircuitsAnalysis() {
        const el = document.getElementById('circuitsAnalysis');
        if (!el) return;
        if (this.sessions.length === 0) {
            el.innerHTML = '<div class="empty-state"><p>📊 Aucune donnée</p></div>';
            return;
        }
        const data = {};
        this.sessions.forEach(s => {
            if (!data[s.circuit]) data[s.circuit] = [];
            data[s.circuit].push(s);
        });
        let circuits = Object.keys(data).sort();
        if (this.selectedCircuit !== 'all') circuits = circuits.filter(c => c === this.selectedCircuit);
        el.innerHTML = '';
        circuits.forEach(circuit => this.renderCircuitTile(el, circuit, data[circuit]));
    }

    renderCircuitTile(container, circuit, sessions) {
        const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
        const best = Math.min(...sessions.map(s => s.bestTime));
        const avg = sessions.reduce((s, x) => s + x.bestTime, 0) / sessions.length;
        const totalLaps = sessions.reduce((s, x) => s + (x.lapsCount || 0), 0);
        const bestSess = sessions.find(s => s.bestTime === best);
        const conds = [bestSess.weather, bestSess.tireType ? 'Pneus: ' + bestSess.tireType : '', bestSess.tirePressure ? bestSess.tirePressure + ' bar' : '', bestSess.maxLaps ? bestSess.maxLaps + ' t.moteur' : ''].filter(Boolean).join(' • ');
        const chartId = 'chart-' + circuit.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

        const tile = document.createElement('div');
        tile.className = 'circuit-tile';
        tile.innerHTML = `
            <div class="circuit-tile-name">🏁 ${circuit}</div>
            <div class="circuit-best-time-line">
                <span>Mon meilleur :</span>
                <span class="circuit-best-time-value">${this.formatTime(best)}</span>
                <button class="btn-view-record-inline" data-id="${bestSess.id}">📋 Détails</button>
            </div>
            <div class="circuit-conditions-summary">${conds || '-'}</div>
            <div class="circuit-tile-chart"><canvas id="${chartId}"></canvas></div>
            <div class="circuit-tile-stats">
                <div class="circuit-mini-stat"><div class="circuit-mini-stat-label">Sessions</div><div class="circuit-mini-stat-value">${sessions.length}</div></div>
                <div class="circuit-mini-stat"><div class="circuit-mini-stat-label">Moy.</div><div class="circuit-mini-stat-value">${this.formatTime(avg)}</div></div>
                <div class="circuit-mini-stat"><div class="circuit-mini-stat-label">Tours</div><div class="circuit-mini-stat-value">${totalLaps}</div></div>
            </div>`;

        tile.querySelector('.btn-view-record-inline').addEventListener('click', () => this.showSessionDetails(bestSess.id));
        container.appendChild(tile);
        setTimeout(() => this.createChart(chartId, sorted), 50);
    }

    createChart(id, sessions) {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        if (this.circuitCharts[id]) this.circuitCharts[id].destroy();
        const labels = sessions.map(s => { const d = new Date(s.date); return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); });
        this.circuitCharts[id] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [{ label: 'Temps', data: sessions.map(s => s.bestTime), borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', tension: 0.4, fill: true, pointRadius: 5, pointHoverRadius: 7, pointBackgroundColor: '#667eea', pointBorderColor: '#fff', pointBorderWidth: 2 }]
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => { const s = sessions[ctx.dataIndex]; return ['Temps: ' + this.formatTime(s.bestTime), s.weather || '', s.lapsCount ? 'Tours: ' + s.lapsCount : ''].filter(Boolean); }}, backgroundColor: '#1a1a1a', titleColor: '#fff', bodyColor: '#ccc', borderColor: '#444', borderWidth: 1 }},
                scales: { y: { beginAtZero: false, ticks: { callback: v => this.formatTime(v), color: '#999' }, grid: { color: '#2a2a2a' }}, x: { ticks: { color: '#999' }, grid: { color: '#2a2a2a' }}}
            }
        });
    }

    displaySessions() {
        const el = document.getElementById('sessionsList');
        if (!el) return;
        if (this.sessions.length === 0) {
            el.innerHTML = '<div class="empty-state"><p>🏎️ Aucune session</p></div>'; return;
        }
        const sorted = [...this.sessions].sort((a, b) => new Date(b.date + ' ' + (b.time || '')) - new Date(a.date + ' ' + (a.time || '')));
        el.innerHTML = sorted.map(s => this.sessionItemHTML(s, true)).join('');
    }

    sessionItemHTML(s, showDelete) {
        // Détecter si c'est le record du circuit
        const circuitSessions = this.sessions.filter(x => x.circuit === s.circuit);
        const bestTime = Math.min(...circuitSessions.map(x => x.bestTime));
        const isRecord = s.bestTime === bestTime;

        // Ligne 2 : infos conditions dans le bon ordre
        const line2 = [
            s.tireType ? '🛞 ' + s.tireType : '',
            s.tirePressure ? s.tirePressure + ' bar' : '',
            s.temperature ? '🌡️ ' + s.temperature + '°C' : '',
            s.weather || ''
        ].filter(Boolean).join(' · ');

        const deleteBtn = showDelete ? `<button class="btn-delete session-btn" data-id="${s.id}">🗑️</button>` : '';

        return `<div class="session-item">
            <div class="session-content">
                <div class="session-line1">
                    <span class="session-date">${this.formatDateShort(s.date)} ${s.time || ''}</span>
                    <span class="session-circuit">📍 ${s.circuit}</span>
                </div>
                <div class="session-line2">
                    <span class="session-time ${isRecord ? 'session-record' : ''}">⏱️ ${this.formatTime(s.bestTime)}${isRecord ? ' 🏆' : ''}</span>
                    ${line2 ? `<span class="session-conditions">${line2}</span>` : ''}
                </div>
            </div>
            <div class="session-actions">
                <button class="btn-details session-btn" data-id="${s.id}">👁️</button>
                <button class="btn-edit session-btn" data-id="${s.id}">✏️</button>
                ${deleteBtn}
            </div>
        </div>`;
    }

    // ── NAVIGATION ────────────────────────────────────────────────────────

    switchView(view) {
        document.querySelectorAll('.view-section').forEach(s => s.style.display = 'none');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const section = document.querySelector(`.view-section[data-view="${view}"]`);
        if (section) section.style.display = 'block';
        document.querySelectorAll(`.nav-btn[data-view="${view}"]`).forEach(b => b.classList.add('active'));
        if (view === 'add-session') this.setCurrentTime();
        if (view === 'settings') this.displayProfile();
    }

    // ── THEME ─────────────────────────────────────────────────────────────

    applyTheme() {
        const mode = localStorage.getItem('themeMode') || 'dark';
        const body = document.body;
        if (mode === 'light') {
            body.style.background = '#f5f5f5';
            body.style.color = '#111';
        } else {
            body.style.background = '#0a0a0a';
            body.style.color = '#fff';
        }
        const sel = document.getElementById('themeMode');
        if (sel) sel.value = mode;
    }

    saveTheme() {
        const mode = document.getElementById('themeMode').value;
        localStorage.setItem('themeMode', mode);
        this.applyTheme();
        this.showNotification('Thème appliqué ✅');
    }

    // ── PWA ───────────────────────────────────────────────────────────────

    setPwaInstructions() {
        const inst = document.getElementById('pwaInstructions');
        const btn = document.getElementById('installBtn');
        if (!inst) return;

        const ua = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/.test(ua);
        const isAndroid = /Android/.test(ua);
        const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);

        if (deferredPrompt && btn) {
            btn.style.display = 'block';
            inst.innerHTML = '<p style="color:#10b981; font-size:0.9em; margin-bottom:10px;">✅ Prêt à installer sur votre écran d\'accueil</p>';
            return;
        }

        if (isIOS || isSafari) {
            inst.innerHTML = `
                <div style="background:#1a1a1a; border-radius:8px; padding:15px; border:1px solid #2a2a2a;">
                    <p style="color:#667eea; font-weight:600; margin:0 0 10px;">📱 Installation iOS/Safari :</p>
                    <ol style="color:#ccc; font-size:0.85em; margin:0; padding-left:20px; line-height:1.6;">
                        <li>Appuyez sur le bouton <strong>Partager</strong> (📤) en bas</li>
                        <li>Faites défiler et sélectionnez <strong>"Sur l'écran d'accueil"</strong></li>
                        <li>Appuyez sur <strong>"Ajouter"</strong></li>
                    </ol>
                </div>`;
            if (btn) btn.style.display = 'none';
        }
        else if (isAndroid) {
            inst.innerHTML = `
                <div style="background:#1a1a1a; border-radius:8px; padding:15px; border:1px solid #2a2a2a;">
                    <p style="color:#667eea; font-weight:600; margin:0 0 10px;">📱 Installation Android :</p>
                    <ol style="color:#ccc; font-size:0.85em; margin:0; padding-left:20px; line-height:1.6;">
                        <li>Appuyez sur les <strong>3 points</strong> (⋮) du menu Chrome</li>
                        <li>Sélectionnez <strong>"Ajouter à l'écran d'accueil"</strong></li>
                        <li>Confirmez avec <strong>"Ajouter"</strong></li>
                    </ol>
                </div>`;
            if (btn) btn.style.display = 'none';
        }
        else {
            inst.innerHTML = `
                <div style="background:#1a1a1a; border-radius:8px; padding:15px; border:1px solid #2a2a2a;">
                    <p style="color:#667eea; font-weight:600; margin:0 0 10px;">💻 Installation Desktop :</p>
                    <p style="color:#ccc; font-size:0.85em; margin:0; line-height:1.6;">
                        Cherchez l'icône <strong>⊕</strong> ou <strong>🖥️</strong> dans la barre d'adresse (à droite) et cliquez dessus pour installer l'application.
                    </p>
                </div>`;
            if (btn) btn.style.display = 'none';
        }
    }

    // ── LOGOUT ────────────────────────────────────────────────────────────

    async logout() {
        if (!confirm('Se déconnecter ?')) return;
        await auth.signOut();
        location.reload();
    }

    // ── DELETE ACCOUNT ────────────────────────────────────────────────────

    async clearAllData() {
        const count = this.sessions.length;
        if (!confirm(`⚠️ Supprimer DÉFINITIVEMENT ?\n\n• ${count} session(s)\n• Votre profil\n• Vos circuits\n\nAction IRRÉVERSIBLE !`)) return;
        const confirm2 = prompt('Tapez votre nom de pilote pour confirmer :');
        if (confirm2 !== this.profile.pilotName) {
            this.showNotification('Nom incorrect. Annulé.', 'error'); return;
        }
        try {
            const uid = this.currentUser.uid;
            this.showNotification('🗑️ Suppression...', 'error');
            const sessSnap = await db.collection('users').doc(uid).collection('sessions').get();
            await Promise.all(sessSnap.docs.map(d => d.ref.delete()));
            await db.collection('users').doc(uid).collection('profile').doc('data').delete();
            await db.collection('users').doc(uid).collection('settings').doc('circuits').delete();
            this.showNotification('Compte supprimé', 'success');
            setTimeout(() => auth.signOut().then(() => location.reload()), 2000);
        } catch(e) {
            this.showNotification('Erreur suppression', 'error');
        }
    }

    // ── UTILITAIRES ───────────────────────────────────────────────────────

    formatTime(seconds) {
        if (isNaN(seconds)) return '-';
        if (seconds >= 60) {
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            const ms = Math.floor((seconds % 1) * 1000);
            return `${m}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}m`;
        }
        const s = Math.floor(seconds);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${s}.${String(ms).padStart(3,'0')}s`;
    }

    formatDate(d) {
        return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    formatDateShort(d) {
        return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    setTodayDate() {
        const el = document.getElementById('date');
        if (el) el.value = new Date().toISOString().split('T')[0];
    }

    setCurrentTime() {
        const el = document.getElementById('time');
        if (el) {
            const now = new Date();
            el.value = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
        }
    }

    showNotification(msg, type = 'success') {
        const n = document.createElement('div');
        n.style.cssText = `position:fixed;top:20px;right:20px;background:${type==='success'?'#10b981':'#ef4444'};color:#fff;padding:14px 22px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.4);z-index:9999;font-size:0.95em;font-weight:500;max-width:300px;`;
        n.textContent = msg;
        document.body.appendChild(n);
        setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity 0.3s'; setTimeout(() => n.remove(), 300); }, 3000);
    }

    // ── SETUP EVENT LISTENERS ─────────────────────────────────────────────

    setupEventListeners() {
        // Google signin
        document.getElementById('googleSignInBtn').addEventListener('click', async () => {
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                await auth.signInWithPopup(provider);
            } catch(e) {
                showNotifGlobal('Erreur Google : ' + e.message, 'error');
            }
        });

        // Auth form
        document.getElementById('authSubmitBtn').addEventListener('click', handleEmailAuth);
        document.getElementById('authToggleBtn').addEventListener('click', toggleAuthMode);
        document.getElementById('authPassword').addEventListener('keypress', e => { if (e.key === 'Enter') handleEmailAuth(); });

        // Session form
        document.getElementById('sessionForm').addEventListener('submit', e => { e.preventDefault(); this.addSession(); });

        // Cancel edit
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.cancelEdit());

        // Add circuit
        document.getElementById('addCircuitBtn').addEventListener('click', () => this.addNewCircuit());

        // Circuit filter
        document.getElementById('circuitFilter').addEventListener('change', e => this.filterCircuit(e.target.value));

        // Profile modal
        document.getElementById('saveProfileBtn').addEventListener('click', saveProfileModal);
        document.getElementById('cguLink').addEventListener('click', e => { e.preventDefault(); showModal('cguModal'); });
        document.getElementById('closeCguBtn').addEventListener('click', () => hideModal('cguModal'));

        // Session modal
        document.getElementById('closeSessionBtn').addEventListener('click', () => hideModal('sessionModal'));

        // FAQ
        document.getElementById('faqBtn').addEventListener('click', () => showModal('faqModal'));
        document.getElementById('closeFaqBtn').addEventListener('click', () => hideModal('faqModal'));

        // Record popup
        document.getElementById('closeRecordBtn').addEventListener('click', closeRecord);

        // Nav buttons
        document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.getAttribute('data-view')));
        });

        // Settings buttons
        document.getElementById('saveProfileSettingsBtn').addEventListener('click', () => this.saveProfileSettings());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearAllData());
        document.getElementById('themeMode').addEventListener('change', () => this.saveTheme());

        // Install PWA
        const installBtn = document.getElementById('installBtn');
        if (installBtn) installBtn.addEventListener('click', installPWA);

        // Délégation pour boutons sessions (edit/delete/details)
        document.getElementById('recentSessionsList').addEventListener('click', e => {
            const btn = e.target.closest('[data-id]');
            if (!btn) return;
            const id = parseInt(btn.getAttribute('data-id'));
            if (btn.classList.contains('btn-details')) this.showSessionDetails(id);
            else if (btn.classList.contains('btn-edit')) this.editSession(id);
            else if (btn.classList.contains('btn-delete')) this.deleteSession(id);
        });
        document.getElementById('sessionsList').addEventListener('click', e => {
            const btn = e.target.closest('[data-id]');
            if (!btn) return;
            const id = parseInt(btn.getAttribute('data-id'));
            if (btn.classList.contains('btn-details')) this.showSessionDetails(id);
            else if (btn.classList.contains('btn-edit')) this.editSession(id);
            else if (btn.classList.contains('btn-delete')) this.deleteSession(id);
        });
    }
}

// ── LANCEMENT ─────────────────────────────────────────────────────────────

let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new KartingDashboard();
});

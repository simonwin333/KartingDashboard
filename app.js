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
        const sorted = [...sessions].sort((a, b) => new Date(a.date + ' ' + (a.time||'')) - new Date(b.date + ' ' + (b.time||'')));
        const best = Math.min(...sessions.map(s => s.bestTime));
        const avg = sessions.reduce((s, x) => s + x.bestTime, 0) / sessions.length;
        const totalLaps = sessions.reduce((s, x) => s + (x.lapsCount || 0), 0);
        const bestSess = sessions.find(s => s.bestTime === best);
        const ecart = avg - best;

        const cid = circuit.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        const chartId1 = 'chart-evol-' + cid;
        const chartId2 = 'chart-pneu-' + cid;
        const chartId3 = 'chart-bvs-' + cid;
        const chartId4 = 'chart-press-' + cid;

        // Chips réglage optimal — toutes blanches
        const optimalChips = [
            bestSess.tireType ? '🛞 ' + bestSess.tireType : '',
            bestSess.tirePressure ? bestSess.tirePressure + ' bar' : '',
            bestSess.weather || '',
            bestSess.temperature ? '🌡️ ' + bestSess.temperature + '°C' : '',
            bestSess.crownUsed ? 'Couronne ' + bestSess.crownUsed : ''
        ].filter(Boolean);

        // Conditions du record : 2 lignes
        const condLine1 = [
            bestSess.tireType ? '🛞 ' + bestSess.tireType : '',
            bestSess.tirePressure ? bestSess.tirePressure + ' bar' : ''
        ].filter(Boolean).join(' · ');
        const condLine2 = [
            bestSess.temperature ? '🌡️ ' + bestSess.temperature + '°C' : '',
            bestSess.weather || ''
        ].filter(Boolean).join(' · ');

        const tile = document.createElement('div');
        tile.className = 'circuit-tile';
        tile.innerHTML = `
            <div class="circuit-tile-name">🏁 ${circuit}</div>

            <div class="ct-record-line">
                <span class="ct-best-badge">${this.formatTime(best)} 🏆</span>
                <div class="ct-record-info">
                    <div class="ct-record-label">Record personnel</div>
                    ${condLine1 ? `<div class="ct-record-cond">${condLine1}</div>` : ''}
                    ${condLine2 ? `<div class="ct-record-cond">${condLine2}</div>` : ''}
                </div>
                <button class="btn-details session-btn ct-eye-btn" data-id="${bestSess.id}">👁️</button>
            </div>

            <div class="ct-stats-row">
                <div class="ct-stat"><div class="ct-stat-val">${sessions.length}</div><div class="ct-stat-lbl">Sessions</div></div>
                <div class="ct-stat-div"></div>
                <div class="ct-stat"><div class="ct-stat-val">${totalLaps}</div><div class="ct-stat-lbl">Tours</div></div>
                <div class="ct-stat-div"></div>
                <div class="ct-stat"><div class="ct-stat-val" style="color:#667eea">${this.formatTime(avg)}</div><div class="ct-stat-lbl">Moyenne</div></div>
                <div class="ct-stat-div"></div>
                <div class="ct-stat"><div class="ct-stat-val" style="color:#f59e0b">+${this.formatTime(ecart)}</div><div class="ct-stat-lbl">Écart moy.</div></div>
            </div>

            <div class="ct-reglage">
                <div class="ct-reglage-title">⚙️ RÉGLAGE OPTIMAL</div>
                <div class="ct-chips">${optimalChips.map(c => `<span class="ct-chip">${c}</span>`).join('')}</div>
            </div>

            <div class="ct-chart-block">
                <div class="ct-chart-title">📈 Évolution des chronos</div>
                <canvas id="${chartId1}"></canvas>
                <div class="ct-analysis" id="analysis-${cid}"></div>
            </div>
            <div class="ct-chart-block">
                <div class="ct-chart-title">🛞 Chrono moyen par type de pneu</div>
                <canvas id="${chartId2}"></canvas>
            </div>
            <div class="ct-chart-block">
                <div class="ct-chart-title">📊 Meilleur vs Moyenne par session</div>
                <canvas id="${chartId3}"></canvas>
            </div>
            <div class="ct-chart-block">
                <div class="ct-chart-title">🔵 Pression pneu → Impact sur le chrono</div>
                <canvas id="${chartId4}"></canvas>
            </div>
            <div class="ct-chart-block" id="matrix-block-${cid}">
                <div class="ct-chart-title">⚙️ Matrice réglage — Pneu × Pression</div>
                <div class="ct-matrix-wrap" id="matrix-${cid}"></div>
                <div class="ct-matrix-legend">
                    <span class="ct-legend-l">Rapide</span>
                    <div class="ct-legend-gradient"></div>
                    <span class="ct-legend-r">Lent</span>
                </div>
                <div class="ct-matrix-tooltip" id="matrix-tooltip-${cid}"></div>
                <div class="ct-analysis" id="matrix-insight-${cid}"></div>
            </div>`;

        tile.querySelector('.ct-eye-btn').addEventListener('click', () => this.showSessionDetails(bestSess.id));
        container.appendChild(tile);

        setTimeout(() => {
            this.createChartEvolution(chartId1, sorted, best, cid);
            this.createChartPneu(chartId2, sessions);
            this.createChartBvsMoy(chartId3, sorted);
            this.createChartPression(chartId4, sessions);
            this.createMatrice(cid, sessions);
        }, 50);
    }

    // Graphique 1 — Évolution des chronos
    createChartEvolution(id, sessions, best, cid) {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        if (this.circuitCharts[id]) this.circuitCharts[id].destroy();
        const labels = sessions.map(s => { const d = new Date(s.date); return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }) + (s.time ? ' ' + s.time.substring(0,5) : ''); });
        const ptColors = sessions.map(s => s.bestTime === best ? '#10b981' : '#667eea');
        const self = this;
        this.circuitCharts[id] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels, datasets: [{ data: sessions.map(s => s.bestTime), borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.08)', tension: 0.4, fill: true, pointRadius: 6, pointHoverRadius: 8, pointBackgroundColor: ptColors, pointBorderColor: '#fff', pointBorderWidth: 2,
                datalabels: { display: true }
            }] },
            options: { responsive:true, maintainAspectRatio:false,
                plugins: {
                    legend:{display:false},
                    tooltip:{ callbacks:{ label: ctx => { const s = sessions[ctx.dataIndex]; return [self.formatTime(s.bestTime), s.tireType ? '🛞 '+s.tireType : '', s.weather||''].filter(Boolean); }}, backgroundColor:'#1a1a1a', titleColor:'#fff', bodyColor:'#ccc', borderColor:'#333', borderWidth:1 }
                },
                scales: { y:{ beginAtZero:false, ticks:{ callback: v => self.formatTime(v), color:'#555', font:{size:9} }, grid:{color:'#1e1e1e'} }, x:{ ticks:{color:'#555', font:{size:9}, maxRotation:30}, grid:{color:'#1e1e1e'} } }
            },
            plugins: [{
                id: 'datalabels',
                afterDatasetsDraw(chart) {
                    const ctx = chart.ctx;
                    chart.data.datasets.forEach((dataset, i) => {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((point, index) => {
                            const val = self.formatTime(dataset.data[index]);
                            const isRecord = dataset.data[index] === best;
                            ctx.save();
                            ctx.fillStyle = isRecord ? '#10b981' : '#aaa';
                            ctx.font = 'bold 9px Segoe UI';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                            ctx.fillText(val, point.x, point.y - 8);
                            ctx.restore();
                        });
                    });
                }
            }]
        });

        // Phrase d'analyse automatique
        if (cid) {
            const el = document.getElementById('analysis-' + cid);
            if (el && sessions.length >= 2) {
                const first = sessions[0].bestTime;
                const last = sessions[sessions.length - 1].bestTime;
                const gain = first - best;
                const prevLast = sessions[sessions.length - 2].bestTime;
                const trend = last < prevLast ? 'en progression 📈' : 'en légère régression 📉';
                let phrase = '';
                if (gain > 0) {
                    phrase = `💡 Tu as gagné <strong>${self.formatTime(gain)}</strong> depuis ta 1ère session sur ce circuit.`;
                } else {
                    phrase = `💡 Chrono stable sur ce circuit.`;
                }
                if (sessions.length >= 3) phrase += ` Ta dernière session est ${trend}.`;
                el.innerHTML = phrase;
            }
        }
    }

    // Graphique 2 — Temps moyen par pneu
    createChartPneu(id, sessions) {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        if (this.circuitCharts[id]) this.circuitCharts[id].destroy();
        const byTire = {};
        sessions.forEach(s => {
            if (!s.tireType) return;
            if (!byTire[s.tireType]) byTire[s.tireType] = [];
            byTire[s.tireType].push(s.bestTime);
        });
        const labels = Object.keys(byTire);
        if (labels.length === 0) { canvas.parentElement.style.display='none'; return; }
        const avgs = labels.map(t => byTire[t].reduce((a,b)=>a+b,0) / byTire[t].length);
        const minAvg = Math.min(...avgs);
        const bgColors = avgs.map(v => v === minAvg ? '#10b981aa' : '#667eeaaa');
        const bdColors = avgs.map(v => v === minAvg ? '#10b981' : '#667eea');
        this.circuitCharts[id] = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets: [{ data: avgs, backgroundColor: bgColors, borderColor: bdColors, borderWidth:1, borderRadius:6 }] },
            options: { responsive:true, maintainAspectRatio:false,
                plugins: { legend:{display:false}, tooltip:{ callbacks:{ label: ctx => this.formatTime(ctx.raw) }, backgroundColor:'#1a1a1a', titleColor:'#fff', bodyColor:'#ccc', borderColor:'#333', borderWidth:1 }},
                scales: { y:{ beginAtZero:false, ticks:{ callback: v => this.formatTime(v), color:'#555', font:{size:9} }, grid:{color:'#1e1e1e'} }, x:{ ticks:{color:'#555', font:{size:9}}, grid:{color:'#1e1e1e'} } }
            }
        });
    }

    // Graphique 3 — Meilleur vs Moyenne par session
    createChartBvsMoy(id, sessions) {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        if (this.circuitCharts[id]) this.circuitCharts[id].destroy();
        const labels = sessions.map((s,i) => 'S'+(i+1));
        // "Meilleur" = bestTime de chaque session, "Moyenne" = on n'a qu'un temps par session donc on simule +5% pour la moyenne
        const bests = sessions.map(s => s.bestTime);
        // Si on a un champ avgTime on l'utilise, sinon on indique juste le bestTime avec un écart estimé
        const moyennes = sessions.map(s => s.avgTime || null);
        const hasMoy = moyennes.some(v => v !== null);
        const datasets = [
            { label:'Meilleur', data: bests, borderColor:'#10b981', backgroundColor:'transparent', tension:0.4, pointRadius:4, pointBackgroundColor:'#10b981', pointBorderColor:'#fff', pointBorderWidth:2 }
        ];
        if (hasMoy) {
            datasets.push({ label:'Moyenne', data: moyennes, borderColor:'#667eea', backgroundColor:'rgba(102,126,234,0.06)', tension:0.4, fill:true, borderDash:[4,3], pointRadius:4, pointBackgroundColor:'#667eea', pointBorderColor:'#fff', pointBorderWidth:2 });
        }
        this.circuitCharts[id] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels, datasets },
            options: { responsive:true, maintainAspectRatio:false,
                plugins: { legend:{ display: hasMoy, labels:{ color:'#999', font:{size:9}, boxWidth:12, padding:8 }}, tooltip:{ callbacks:{ label: ctx => ctx.dataset.label+': '+this.formatTime(ctx.raw) }, backgroundColor:'#1a1a1a', titleColor:'#fff', bodyColor:'#ccc', borderColor:'#333', borderWidth:1 }},
                scales: { y:{ beginAtZero:false, ticks:{ callback: v => this.formatTime(v), color:'#555', font:{size:9} }, grid:{color:'#1e1e1e'} }, x:{ ticks:{color:'#555', font:{size:9}}, grid:{color:'#1e1e1e'} } }
            }
        });
    }

    // Graphique 4 — Pression vs Temps (scatter)
    createChartPression(id, sessions) {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        if (this.circuitCharts[id]) this.circuitCharts[id].destroy();
        const data = sessions.filter(s => s.tirePressure).map(s => ({ x: parseFloat(s.tirePressure), y: s.bestTime }));
        if (data.length < 2) { canvas.parentElement.style.display='none'; return; }
        const best = Math.min(...data.map(d=>d.y));
        const ptColors = data.map(d => d.y === best ? '#10b981' : '#667eea');
        this.circuitCharts[id] = new Chart(canvas.getContext('2d'), {
            type: 'scatter',
            data: { datasets: [{ data, backgroundColor: ptColors, pointRadius:7, pointHoverRadius:9, pointBorderColor:'#fff', pointBorderWidth:2 }] },
            options: { responsive:true, maintainAspectRatio:false,
                plugins: { legend:{display:false}, tooltip:{ callbacks:{ label: ctx => ctx.raw.x+' bar → '+this.formatTime(ctx.raw.y) }, backgroundColor:'#1a1a1a', titleColor:'#fff', bodyColor:'#ccc', borderColor:'#333', borderWidth:1 }},
                scales: {
                    y:{ beginAtZero:false, ticks:{ callback: v => this.formatTime(v), color:'#555', font:{size:9} }, grid:{color:'#1e1e1e'} },
                    x:{ ticks:{ callback: v => v+' b', color:'#555', font:{size:9} }, grid:{color:'#1e1e1e'}, title:{ display:true, text:'Pression (bar)', color:'#555', font:{size:9} } }
                }
            }
        });
    }

    // Matrice pneu × pression
    createMatrice(cid, sessions) {
        const wrap = document.getElementById('matrix-' + cid);
        if (!wrap) return;

        // Collecter les combinaisons pneu × pression
        const pneus = [...new Set(sessions.filter(s => s.tireType).map(s => s.tireType))].sort();
        const pressions = [...new Set(sessions.filter(s => s.tirePressure).map(s => String(s.tirePressure)))].sort((a,b) => parseFloat(a)-parseFloat(b));

        if (pneus.length === 0 || pressions.length === 0) {
            document.getElementById('matrix-block-' + cid).style.display = 'none';
            return;
        }

        // Construire les données : meilleur chrono par combo
        const matData = {};
        pneus.forEach(p => {
            matData[p] = {};
            pressions.forEach(pr => {
                const matching = sessions.filter(s => s.tireType === p && String(s.tirePressure) === pr);
                if (matching.length > 0) {
                    matData[p][pr] = { best: Math.min(...matching.map(s => s.bestTime)), count: matching.length };
                } else {
                    matData[p][pr] = null;
                }
            });
        });

        // Min / max pour colorisation
        const allTimes = [];
        pneus.forEach(p => pressions.forEach(pr => { if (matData[p][pr]) allTimes.push(matData[p][pr].best); }));
        if (allTimes.length < 2) { document.getElementById('matrix-block-' + cid).style.display = 'none'; return; }
        const minT = Math.min(...allTimes);
        const maxT = Math.max(...allTimes);

        function timeToColor(t) {
            const ratio = maxT === minT ? 0 : (t - minT) / (maxT - minT);
            let r, g, b;
            if (ratio < 0.5) {
                const f = ratio * 2;
                r = Math.round(16 + (245 - 16) * f);
                g = Math.round(185 + (158 - 185) * f);
                b = Math.round(129 + (11 - 129) * f);
            } else {
                const f = (ratio - 0.5) * 2;
                r = Math.round(245 + (239 - 245) * f);
                g = Math.round(158 + (68 - 158) * f);
                b = Math.round(11 + (68 - 11) * f);
            }
            return `rgb(${r},${g},${b})`;
        }

        const self = this;
        // Construire le tableau HTML
        let html = '<table class="ct-matrix-table"><thead><tr><th class="ct-matrix-rh">Pneu / Bar</th>';
        pressions.forEach(pr => { html += `<th class="ct-matrix-ch">${pr}b</th>`; });
        html += '</tr></thead><tbody>';

        pneus.forEach(pneu => {
            html += `<tr><th class="ct-matrix-rh">${pneu}</th>`;
            pressions.forEach(pr => {
                const cell = matData[pneu][pr];
                if (!cell) {
                    html += `<td><div class="ct-matrix-cell ct-matrix-empty">—<br><span>Non testé</span></div></td>`;
                } else {
                    const color = timeToColor(cell.best);
                    const isBest = cell.best === minT;
                    html += `<td><div class="ct-matrix-cell" style="background:${color}22;border:1.5px solid ${color}88;" data-pneu="${pneu}" data-pr="${pr}" data-best="${cell.best}" data-count="${cell.count}" data-cid="${cid}">
                        ${isBest ? '<div class="ct-matrix-dot"></div>' : ''}
                        <span class="ct-matrix-time" style="color:${color}">${self.formatTime(cell.best)}</span>
                        <span class="ct-matrix-n">${cell.count} sess.</span>
                    </div></td>`;
                }
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        wrap.innerHTML = html;

        // Tooltip au clic
        wrap.querySelectorAll('.ct-matrix-cell[data-pneu]').forEach(cell => {
            cell.addEventListener('click', () => {
                const tooltip = document.getElementById('matrix-tooltip-' + cell.dataset.cid);
                if (!tooltip) return;
                const best = parseFloat(cell.dataset.best);
                const diff = best - minT;
                tooltip.innerHTML = `<strong>${cell.dataset.pneu} + ${cell.dataset.pr} bar</strong> · ${self.formatTime(best)}<br>` +
                    (diff === 0 ? `<span style="color:#10b981">✓ Meilleure combinaison !</span>` : `Écart vs optimal : <span style="color:#f59e0b">+${self.formatTime(diff)}</span>`) +
                    ` · ${cell.dataset.count} session(s)`;
                tooltip.style.display = 'block';
            });
        });

        // Insight
        const insightEl = document.getElementById('matrix-insight-' + cid);
        if (insightEl) {
            const bestSess = sessions.find(s => s.bestTime === minT);
            const worstTime = Math.max(...allTimes);
            const worstSess = sessions.find(s => s.bestTime === worstTime);
            let insight = '';
            if (bestSess && bestSess.tireType && bestSess.tirePressure) {
                insight = `💡 Combo optimal : <strong>${bestSess.tireType} + ${bestSess.tirePressure} bar</strong> → ${this.formatTime(minT)}.`;
                if (worstSess && worstSess.tireType && worstSess.tirePressure && (worstSess.tireType !== bestSess.tireType || String(worstSess.tirePressure) !== String(bestSess.tirePressure))) {
                    insight += ` Évite <strong>${worstSess.tireType} + ${worstSess.tirePressure} bar</strong> (−${this.formatTime(worstTime - minT)}).`;
                }
            }
            insightEl.innerHTML = insight;
        }
    }

    // Legacy createChart — garde pour compatibilité
    createChart(id, sessions) { this.createChartEvolution(id, sessions, Math.min(...sessions.map(s=>s.bestTime))); }

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

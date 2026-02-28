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

    openCircuitManager() {
        const modal = document.getElementById('circuitManagerModal');
        if (!modal) return;
        this.renderCircuitManagerList();
        modal.style.display = 'flex';
    }

    renderCircuitManagerList() {
        const list = document.getElementById('circuitManagerList');
        if (!list) return;
        if (this.circuits.length === 0) {
            list.innerHTML = '<p style="color:#555;font-size:0.85em;text-align:center;padding:20px 0;">Aucun circuit enregistré.<br>Ajoutez-en un avec le bouton ➕</p>';
            return;
        }
        const self = this;
        list.innerHTML = '';
        this.circuits.forEach((circuit, idx) => {
            const item = document.createElement('div');
            item.className = 'circuit-manager-item';
            item.innerHTML = `
                <div class="circuit-manager-name" id="cm-name-${idx}"><span>${circuit}</span></div>
                <button class="btn-circuit-rename" data-idx="${idx}" title="Renommer">✏️</button>
                <button class="btn-circuit-delete" data-idx="${idx}" title="Supprimer">🗑️</button>`;
            
            item.querySelector('.btn-circuit-rename').addEventListener('click', () => {
                const nameDiv = document.getElementById('cm-name-' + idx);
                const currentName = self.circuits[idx];
                nameDiv.innerHTML = `<input type="text" value="${currentName}" id="cm-input-${idx}" maxlength="40">`;
                const renameBtn = item.querySelector('.btn-circuit-rename');
                renameBtn.textContent = '💾';
                renameBtn.className = 'btn-circuit-save';
                renameBtn.onclick = () => {
                    const newName = document.getElementById('cm-input-' + idx).value.trim();
                    if (!newName) return;
                    if (self.circuits.includes(newName) && newName !== currentName) {
                        self.showNotification('Ce nom existe déjà !', 'error'); return;
                    }
                    // Mettre à jour dans les sessions aussi
                    self.sessions.forEach(s => { if (s.circuit === currentName) s.circuit = newName; });
                    self.sessions.forEach(s => { if (s.circuit === newName) self.saveSessionFirebase(s); });
                    self.circuits[idx] = newName;
                    self.saveCircuitsFirebase();
                    self.populateCircuits();
                    self.updateDashboard();
                    self.showNotification('Circuit renommé ✅');
                    self.renderCircuitManagerList();
                };
            });

            item.querySelector('.btn-circuit-delete').addEventListener('click', () => {
                const name = self.circuits[idx];
                const sessionsCount = self.sessions.filter(s => s.circuit === name).length;
                const msg = sessionsCount > 0
                    ? `Supprimer "${name}" ?
⚠️ ${sessionsCount} session(s) liée(s) seront aussi supprimées.`
                    : `Supprimer le circuit "${name}" ?`;
                if (!confirm(msg)) return;
                if (sessionsCount > 0) {
                    const toDelete = self.sessions.filter(s => s.circuit === name);
                    toDelete.forEach(s => {
                        self.sessions = self.sessions.filter(x => x.id !== s.id);
                        if (self.currentUser) {
                            db.collection('users').doc(self.currentUser.uid).collection('sessions').doc(String(s.id)).delete();
                        }
                    });
                }
                self.circuits.splice(idx, 1);
                self.saveCircuitsFirebase();
                self.populateCircuits();
                self.updateDashboard();
                self.showNotification('Circuit supprimé 🗑️');
                self.renderCircuitManagerList();
            });

            list.appendChild(item);
        });
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
            el.innerHTML = `
                <div class="circuits-empty-state">
                    <div class="ces-icon">🏎️</div>
                    <div class="ces-title">Aucune session enregistrée</div>
                    <div class="ces-sub">Commence par ajouter ta première session pour voir tes statistiques et graphiques ici.</div>
                    <button class="ces-btn" onclick="document.querySelector('.nav-btn[data-view=add-session]').click()">
                        ➕ Ajouter une session
                    </button>
                </div>`;
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
            bestSess.crownUsed ? 'Couronne ' + bestSess.crownUsed : '',
            bestSess.maxLaps ? '🔧 ' + bestSess.maxLaps + ' tr/min' : ''
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

            <div class="ct-chart-block ct-record-block">
                <div class="ct-record-line">
                    <span class="ct-best-badge">${this.formatTime(best)} 🏆</span>
                    <div class="ct-record-info">
                        <div class="ct-record-label">Record personnel</div>
                        ${condLine1 ? `<div class="ct-record-cond">${condLine1}</div>` : ''}
                        ${condLine2 ? `<div class="ct-record-cond">${condLine2}</div>` : ''}
                    </div>
                    <button class="btn-details session-btn ct-eye-btn" data-id="${bestSess.id}">👁️</button>
                </div>
            </div>

            <div class="ct-chart-block ct-stats-block">
                <div class="ct-stats-row">
                    <div class="ct-stat"><div class="ct-stat-val">${sessions.length}</div><div class="ct-stat-lbl">Nb sessions</div></div>
                    <div class="ct-stat-div"></div>
                    <div class="ct-stat"><div class="ct-stat-val">${totalLaps}</div><div class="ct-stat-lbl">Nb tours</div></div>
                    <div class="ct-stat-div"></div>
                    <div class="ct-stat"><div class="ct-stat-val" style="color:#667eea">${this.formatTime(avg)}</div><div class="ct-stat-lbl">Moyenne</div></div>
                    <div class="ct-stat-div"></div>
                    <div class="ct-stat"><div class="ct-stat-val" style="color:#f59e0b">+${this.formatTime(ecart)}</div><div class="ct-stat-lbl">Écart moy.</div></div>
                </div>
            </div>

            <div class="ct-reglage">
                <div class="ct-reglage-title">⚙️ RÉGLAGE OPTIMAL</div>
                <div class="ct-chips">${optimalChips.map(c => `<span class="ct-chip">${c}</span>`).join('')}</div>
            </div>

            <div class="ct-chart-block">
                <div class="ct-chart-header">
                    <span class="ct-chart-title">📈 Évolution des chronos</span>
                    <button class="ct-expand-btn" data-chart="${chartId1}" data-title="📈 Évolution des chronos">⛶ Agrandir</button>
                </div>
                <canvas id="${chartId1}"></canvas>
                <div class="ct-insight-block" id="analysis-${cid}"></div>
            </div>
            <div class="ct-chart-block">
                <div class="ct-chart-header">
                    <span class="ct-chart-title">🛞 Chrono moyen par type de pneu</span>
                    <button class="ct-expand-btn" data-chart="${chartId2}" data-title="🛞 Chrono moyen par type de pneu">⛶ Agrandir</button>
                </div>
                <canvas id="${chartId2}"></canvas>
                <div class="ct-insight-block" id="insight-pneu-${cid}"></div>
            </div>
            <div class="ct-chart-block">
                <div class="ct-chart-header">
                    <span class="ct-chart-title">🔵 Pression pneu → Impact sur le chrono</span>
                    <button class="ct-expand-btn" data-chart="${chartId4}" data-title="🔵 Pression pneu → Impact sur le chrono">⛶ Agrandir</button>
                </div>
                <canvas id="${chartId4}"></canvas>
                <div class="ct-insight-block" id="insight-press-${cid}"></div>
            </div>
            <div class="ct-chart-block" id="matrix-block-${cid}">
                <div class="ct-chart-header">
                    <span class="ct-chart-title">⚙️ Matrice pression pneu</span>
                    <button class="ct-expand-btn ct-expand-matrix-btn" data-cid="${cid}">⛶ Agrandir</button>
                </div>
                <div class="ct-matrix-wrap" id="matrix-${cid}"></div>
                <div class="ct-matrix-legend">
                    <span class="ct-legend-l">Rapide</span>
                    <div class="ct-legend-gradient"></div>
                    <span class="ct-legend-r">Lent</span>
                </div>
                <div class="ct-matrix-tooltip" id="matrix-tooltip-${cid}"></div>
                <div class="ct-insight-block" id="matrix-insight-${cid}"></div>
            </div>`;

        tile.querySelector('.ct-eye-btn').addEventListener('click', () => this.showSessionDetails(bestSess.id));
        tile.querySelectorAll('.ct-expand-btn').forEach(btn => {
            btn.addEventListener('click', () => this.openChartFullscreen(btn.getAttribute('data-chart'), btn.getAttribute('data-title')));
        });
        const matrixExpandBtn = tile.querySelector('.ct-expand-matrix-btn');
        if (matrixExpandBtn) {
            matrixExpandBtn.addEventListener('click', () => this.openMatrixFullscreen(cid, circuit));
        }
        container.appendChild(tile);

        setTimeout(() => {
            this.createChartEvolution(chartId1, sorted, best, cid);
            this.createChartPneu(chartId2, sessions);
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
            data: { labels, datasets: [{ data: sessions.map(s => s.bestTime), borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.08)', tension: 0.4, fill: true, pointRadius: 6, pointHoverRadius: 8, pointBackgroundColor: ptColors, pointBorderColor: '#0a0a0a', pointBorderWidth: 2 }] },
            options: { responsive:true, maintainAspectRatio:false,
                layout: { padding: { top: 26, left: 2, right: 2, bottom: 0 } },
                plugins: { legend:{display:false}, tooltip:{ callbacks:{ label: ctx => { const s = sessions[ctx.dataIndex]; return [self.formatTime(s.bestTime), s.tireType ? '🛞 '+s.tireType : '', s.weather||''].filter(Boolean); }}, backgroundColor:'#1a1a1a', titleColor:'#fff', bodyColor:'#ccc', borderColor:'#333', borderWidth:1 } },
                scales: { y:{ beginAtZero:false, ticks:{ callback: v => self.formatTime(v), color:'#ccc', font:{size:9}, maxTicksLimit:6 }, grid:{color:'#1e1e1e'} }, x:{ ticks:{color:'#ccc', font:{size:9}, maxRotation:30}, grid:{color:'#1e1e1e'} } }
            },
            plugins: [{ id:'datalabels', afterDatasetsDraw(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    chart.getDatasetMeta(i).data.forEach((point, index) => {
                        const val = self.formatTime(dataset.data[index]);
                        const isRecord = dataset.data[index] === best;
                        ctx.save(); ctx.fillStyle = isRecord ? '#10b981' : '#aaa'; ctx.font = 'bold 9px Segoe UI';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(val, point.x, point.y - 8); ctx.restore();
                    });
                });
            }}]
        });
        if (cid) {
            const el = document.getElementById('analysis-' + cid);
            if (el) el.innerHTML = this.buildInsightEvolution(sessions, best, self);
        }
    }

    // Graphique 2 — Chrono moyen par pneu
    createChartPneu(id, sessions) {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        if (this.circuitCharts[id]) this.circuitCharts[id].destroy();
        const byTire = {};
        sessions.forEach(s => { if (!s.tireType) return; if (!byTire[s.tireType]) byTire[s.tireType] = []; byTire[s.tireType].push(s.bestTime); });
        const labels = Object.keys(byTire);
        if (labels.length === 0) { canvas.parentElement.style.display='none'; return; }
        const avgs = labels.map(t => byTire[t].reduce((a,b)=>a+b,0) / byTire[t].length);
        const minAvg = Math.min(...avgs);
        const bgColors = avgs.map(v => v === minAvg ? 'rgba(16,185,129,0.35)' : 'rgba(102,126,234,0.35)');
        const bdColors = avgs.map(v => v === minAvg ? '#10b981' : '#667eea');
        const self2 = this;
        this.circuitCharts[id] = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets: [{ data: avgs, backgroundColor: bgColors, borderColor: bdColors, borderWidth:2, borderRadius:6 }] },
            options: { responsive:true, maintainAspectRatio:false,
                layout: { padding: { top: 26, left: 2, right: 2, bottom: 0 } },
                plugins: { legend:{display:false}, tooltip:{ callbacks:{ label: ctx => self2.formatTime(ctx.raw) }, backgroundColor:'#1a1a1a', titleColor:'#fff', bodyColor:'#ccc', borderColor:'#333', borderWidth:1 }},
                scales: { y:{ beginAtZero:false, suggestedMin: minAvg - (Math.max(...avgs) - minAvg) * 0.6, ticks:{ callback: v => self2.formatTime(v), color:'#ccc', font:{size:9}, maxTicksLimit:5 }, grid:{color:'#1e1e1e'} }, x:{ ticks:{color:'#ccc', font:{size:9}}, grid:{color:'#1e1e1e'} } }
            },
            plugins: [{ id:'barLabels', afterDatasetsDraw(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((ds, i) => {
                    chart.getDatasetMeta(i).data.forEach((bar, idx) => {
                        const val = ds.data[idx];
                        ctx.save(); ctx.fillStyle = val === minAvg ? '#10b981' : '#ccc'; ctx.font = 'bold 10px Segoe UI';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(self2.formatTime(val), bar.x, bar.y - 5); ctx.restore();
                    });
                });
            }}]
        });
        // Insight pneu
        const cidFromId = id.replace('chart-pneu-', '');
        const insightPneuEl = document.getElementById('insight-pneu-' + cidFromId);
        if (insightPneuEl) insightPneuEl.innerHTML = this.buildInsightPneu(labels, avgs, byTire, minAvg, self2);
    }

    // Graphique 3 — Pression vs Temps (scatter)
    createChartPression(id, sessions) {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        if (this.circuitCharts[id]) this.circuitCharts[id].destroy();
        const data = sessions.filter(s => s.tirePressure).map(s => ({ x: parseFloat(s.tirePressure), y: s.bestTime, tireType: s.tireType || '' }));
        if (data.length < 2) { canvas.parentElement.style.display='none'; return; }
        const best = Math.min(...data.map(d=>d.y));
        const ptColors = data.map(d => d.y === best ? '#10b981cc' : '#667eeacc');
        const self3 = this;
        this.circuitCharts[id] = new Chart(canvas.getContext('2d'), {
            type: 'scatter',
            data: { datasets: [{ data, backgroundColor: ptColors, pointRadius:10, pointHoverRadius:13, pointBorderColor:'#0a0a0a', pointBorderWidth:2 }] },
            options: { responsive:true, maintainAspectRatio:false,
                plugins: { legend:{display:false}, tooltip:{ callbacks:{
                    title: ctx => ctx[0].raw.x + ' bar',
                    label: ctx => { const d = ctx.raw; const lines = [self3.formatTime(d.y)]; if (d.tireType) lines.push('🛞 '+d.tireType); if (d.y === best) lines.push('🏆 Record'); return lines; }
                }, backgroundColor:'#1a1a1a', titleColor:'#667eea', bodyColor:'#ccc', borderColor:'#333', borderWidth:1, padding:10 }},
                scales: {
                    y:{ beginAtZero:false, ticks:{ callback: v => self3.formatTime(v), color:'#ccc', font:{size:9}, maxTicksLimit:5 }, grid:{color:'#1e1e1e'} },
                    x:{ ticks:{ callback: v => v+' b', color:'#ccc', font:{size:9} }, grid:{color:'#1e1e1e'}, title:{ display:true, text:'Pression (bar)', color:'#ccc', font:{size:9} } }
                }
            }
        });
        // Insight pression
        const cidFromPressId = id.replace('chart-press-', '');
        const insightPressEl = document.getElementById('insight-press-' + cidFromPressId);
        if (insightPressEl) insightPressEl.innerHTML = this.buildInsightPression(data, best, self3);
    }

    // ── INSIGHTS ─────────────────────────────────────────────────────────

    insightRow(icon, html) {
        return `<div class="ct-insight-row"><span class="ct-insight-icon">${icon}</span><span class="ct-insight-text">${html}</span></div>`;
    }

    buildInsightEvolution(sessions, best, self) {
        if (sessions.length < 2) return '';
        const rows = [];
        const gain = sessions[0].bestTime - best;
        const gainStr = gain > 0 ? `<b style="color:#10b981">−${self.formatTime(gain)}</b>` : '';
        if (gain > 0) rows.push(this.insightRow('📉', `Tu as gagné ${gainStr} depuis ta 1ère session sur ce circuit.`));

        // Série consécutive d'améliorations
        let streak = 0;
        for (let i = sessions.length - 1; i > 0; i--) {
            if (sessions[i].bestTime < sessions[i-1].bestTime) streak++;
            else break;
        }
        if (streak >= 2) rows.push(this.insightRow('🔥', `<b style="color:#10b981">${streak} sessions consécutives</b> en amélioration. Continue comme ça !`));
        else if (sessions[sessions.length-1].bestTime > sessions[sessions.length-2].bestTime)
            rows.push(this.insightRow('📈', `La dernière session est en <b style="color:#f59e0b">légère régression</b> — ça arrive, reste concentré.`));

        // Fréquence
        if (sessions.length >= 3) {
            const dates = sessions.map(s => new Date(s.date + ' ' + (s.time||'00:00')));
            const diffs = [];
            for (let i = 1; i < dates.length; i++) diffs.push((dates[i]-dates[i-1])/(1000*60*60*24));
            const avgDays = Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length);
            const lastDays = Math.round((new Date() - dates[dates.length-1])/(1000*60*60*24));
            rows.push(this.insightRow('📅', `Tu roules en moyenne <b>tous les ${avgDays} jours</b> sur ce circuit. Dernière session il y a <b>${lastDays} jour${lastDays>1?'s':''}</b>.`));
        }

        // Projection
        if (sessions.length >= 4 && gain > 0) {
            const recent = sessions.slice(-3);
            const recentGain = recent[0].bestTime - recent[recent.length-1].bestTime;
            if (recentGain > 0) {
                const proj = best - (recentGain / 2);
                rows.push(this.insightRow('🎯', `À ce rythme, tu pourrais viser <b style="color:#667eea">${self.formatTime(Math.max(proj,0))}</b> dans 3–4 sessions.`));
            }
        }

        if (rows.length === 0) return '';
        return rows.join('');
    }

    buildInsightPneu(labels, avgs, byTire, minAvg, self) {
        if (labels.length === 0) return '';
        const rows = [];
        const bestTire = labels[avgs.indexOf(minAvg)];
        const worstAvg = Math.max(...avgs);
        const diff = worstAvg - minAvg;
        rows.push(this.insightRow('🏆', `Meilleur pneu sur ce circuit : <b style="color:#10b981">${bestTire}</b> <span style="background:#10b98115;color:#10b981;border:1px solid #10b98130;border-radius:10px;font-size:0.82em;padding:1px 7px;margin-left:3px;">−${self.formatTime(diff)} vs autres</span>`));

        // Pneus peu testés
        labels.forEach(t => {
            if (byTire[t] && byTire[t].length === 1) rows.push(this.insightRow('⚠️', `<b style="color:#f59e0b">${t}</b> testé seulement 1 fois — résultat peu fiable, à confirmer.`));
        });

        // Pneus jamais testés
        const allTires = ['Soft','Medium','Hard','Pluie'];
        const missing = allTires.filter(t => !labels.includes(t));
        if (missing.length > 0) rows.push(this.insightRow('📌', `Jamais testé sur ce circuit : <b>${missing.join(', ')}</b>. Potentiel d'exploration.`));

        return rows.join('');
    }

    buildInsightPression(data, best, self) {
        if (data.length < 3) return '';
        const rows = [];
        const sorted = [...data].sort((a,b)=>a.x-b.x);
        const bestData = data.find(d=>d.y===best);

        if (bestData) rows.push(this.insightRow('🎯', `Meilleure pression sur ce circuit : <b style="color:#10b981">${bestData.x} bar</b> → ${self.formatTime(best)}.`));

        // Comparer haut vs bas
        const pressures = [...new Set(data.map(d=>d.x))].sort((a,b)=>a-b);
        if (pressures.length >= 3) {
            const lowP = pressures[0], highP = pressures[pressures.length-1];
            const lowAvg = data.filter(d=>d.x===lowP).reduce((a,d)=>a+d.y,0)/data.filter(d=>d.x===lowP).length;
            const highAvg = data.filter(d=>d.x===highP).reduce((a,d)=>a+d.y,0)/data.filter(d=>d.x===highP).length;
            if (lowAvg > best + 0.3) rows.push(this.insightRow('📉', `En dessous de <b style="color:#f59e0b">${lowP} bar</b> : chrono dégradé de <b style="color:#ef4444">+${self.formatTime(lowAvg-best)}</b> en moyenne.`));
            if (highAvg > best + 0.3) rows.push(this.insightRow('📉', `Au-dessus de <b style="color:#f59e0b">${highP} bar</b> : chrono dégradé de <b style="color:#ef4444">+${self.formatTime(highAvg-best)}</b> en moyenne.`));
        }

        // Corrélation température
        const withTemp = data.filter(d => d.temperature);
        // Note: on ne peut pas accéder à la température ici facilement, on mentionne juste le nb de sessions
        rows.push(this.insightRow('💡', `Analyse basée sur <b>${data.length} session${data.length>1?'s':''}</b> avec données de pression. Plus tu en ajoutes, plus l'analyse est fiable.`));

        return rows.join('');
    }

    buildInsightMatrice(sessions, matData, pneus, pressions, minT, allTimes) {
        const rows = [];
        const bestSess = sessions.find(s => s.bestTime === minT);

        // Combo gagnant
        if (bestSess && bestSess.tireType && bestSess.tirePressure) {
            const count = sessions.filter(s => s.tireType===bestSess.tireType && String(parseFloat(s.tirePressure))===String(parseFloat(bestSess.tirePressure))).length;
            rows.push(this.insightRow('🏆', `Combo gagnant : <b style="color:#10b981">${bestSess.tireType} + ${parseFloat(bestSess.tirePressure)} bar</b> — testé ${count} fois, c'est ta référence sur ce circuit.`));
        }

        // Combos non testés
        let notTested = 0;
        pressions.forEach(pr => pneus.forEach(p => { if (!matData[pr][p]) notTested++; }));
        const total = pneus.length * pressions.length;
        if (notTested > 0) rows.push(this.insightRow('🔬', `<b style="color:#f59e0b">${notTested} combo${notTested>1?'s':''} non testé${notTested>1?'s':''}</b> sur ${total} possibles. Potentiel d'exploration !`));

        // Suggestion prochaine session
        let suggestion = null;
        pneus.forEach(p => {
            pressions.forEach(pr => {
                if (!matData[pr][p] && p !== bestSess?.tireType) {
                    if (!suggestion) suggestion = `${p} + ${pr} bar`;
                }
            });
        });
        if (suggestion) rows.push(this.insightRow('📌', `À tester : <b style="color:#667eea">${suggestion}</b> — jamais essayé, pourrait surprendre.`));

        // Fiabilité
        let oneSession = 0;
        pressions.forEach(pr => pneus.forEach(p => { if (matData[pr][p] && matData[pr][p].count === 1) oneSession++; }));
        if (oneSession > 0) rows.push(this.insightRow('⚠️', `<b style="color:#f59e0b">${oneSession} case${oneSession>1?'s':''}</b> avec 1 seule session — peu fiable. Vise 2–3 sessions minimum pour confirmer.`));

        if (rows.length === 0) return '';
        return rows.join('');
    }

    // Matrice pression (lignes) x pneu (colonnes)
    createMatrice(cid, sessions) {
        const wrap = document.getElementById('matrix-' + cid);
        if (!wrap) return;
        const pneus = [...new Set(sessions.filter(s => s.tireType).map(s => s.tireType))].sort();
        const pressions = [...new Set(sessions.filter(s => s.tirePressure).map(s => String(parseFloat(s.tirePressure))))].sort((a,b) => parseFloat(a)-parseFloat(b));
        if (pneus.length === 0 || pressions.length === 0) { const b = document.getElementById('matrix-block-'+cid); if(b) b.style.display='none'; return; }
        const matData = {};
        pressions.forEach(pr => { matData[pr] = {}; pneus.forEach(p => { const m = sessions.filter(s => s.tireType===p && String(parseFloat(s.tirePressure))===pr); matData[pr][p] = m.length>0 ? { best: Math.min(...m.map(s=>s.bestTime)), count: m.length } : null; }); });
        const allTimes = []; pressions.forEach(pr => pneus.forEach(p => { if (matData[pr][p]) allTimes.push(matData[pr][p].best); }));
        if (allTimes.length < 2) { const b = document.getElementById('matrix-block-'+cid); if(b) b.style.display='none'; return; }
        const minT = Math.min(...allTimes), maxT = Math.max(...allTimes);
        function timeToColor(t) {
            const ratio = maxT===minT ? 0 : (t-minT)/(maxT-minT);
            let r,g,b;
            if (ratio < 0.5) { const f=ratio*2; r=Math.round(16+(245-16)*f); g=Math.round(185+(158-185)*f); b=Math.round(129+(11-129)*f); }
            else { const f=(ratio-0.5)*2; r=Math.round(245+(239-245)*f); g=Math.round(158+(68-158)*f); b=Math.round(11+(68-11)*f); }
            return 'rgb('+r+','+g+','+b+')';
        }
        const self = this;
        let html = '<table class="ct-matrix-table"><thead><tr><th class="ct-matrix-rh">Bar ↓ / Pneu →</th>';
        pneus.forEach(p => { html += '<th class="ct-matrix-ch">'+p+'</th>'; });
        html += '</tr></thead><tbody>';
        pressions.forEach(pr => {
            html += '<tr><th class="ct-matrix-rh">'+pr+' b</th>';
            pneus.forEach(p => {
                const cell = matData[pr][p];
                if (!cell) { html += '<td><div class="ct-matrix-empty">—<br><span>Non testé</span></div></td>'; }
                else {
                    const color = timeToColor(cell.best); const isBest = cell.best === minT;
                    html += '<td><div class="ct-matrix-cell" style="background:'+color+'22;border:1.5px solid '+color+'88;" data-pneu="'+p+'" data-pr="'+pr+'" data-best="'+cell.best+'" data-count="'+cell.count+'" data-cid="'+cid+'">'+(isBest?'<div class="ct-matrix-dot"></div>':'')+'<span class="ct-matrix-time" style="color:'+color+'">'+self.formatTime(cell.best)+'</span><span class="ct-matrix-n">'+cell.count+' sess.</span></div></td>';
                }
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        wrap.innerHTML = html;
        wrap.querySelectorAll('.ct-matrix-cell[data-pneu]').forEach(cell => {
            cell.addEventListener('click', () => {
                const tooltip = document.getElementById('matrix-tooltip-'+cell.dataset.cid);
                if (!tooltip) return;
                const b = parseFloat(cell.dataset.best), diff = b - minT;
                tooltip.innerHTML = '<strong>'+cell.dataset.pneu+' + '+cell.dataset.pr+' bar</strong> · '+self.formatTime(b)+'<br>'+(diff===0?'<span style="color:#10b981">✓ Meilleure combinaison !</span>':'Écart vs optimal : <span style="color:#f59e0b">+'+self.formatTime(diff)+'</span>')+' · '+cell.dataset.count+' session(s)';
                tooltip.style.display = 'block';
            });
        });
        const insightEl = document.getElementById('matrix-insight-'+cid);
        if (insightEl) insightEl.innerHTML = this.buildInsightMatrice(sessions, matData, pneus, pressions, minT, allTimes);
    }

    // Plein écran graphique
    async openChartFullscreen(chartId, title) {
        const sourceChart = this.circuitCharts[chartId];
        if (!sourceChart) return;
        let overlay = document.getElementById('chartOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'chartOverlay';
            overlay.className = 'chart-overlay';
            overlay.innerHTML = '<div class="chart-overlay-inner"><div class="chart-overlay-header"><span class="chart-overlay-title" id="overlayTitle"></span><button class="chart-overlay-close" id="overlayClose">✕</button></div><div class="chart-overlay-canvas-wrap"><canvas id="chartOverlayCanvas"></canvas></div><div class="chart-overlay-rotate-hint" id="overlayRotateHint">📱 Tourne ton téléphone pour voir le graphique en grand</div><div class="chart-overlay-hint">Appuie sur ✕ pour revenir</div></div>';
            document.body.appendChild(overlay);
            document.getElementById('overlayClose').addEventListener('click', () => this.closeChartFullscreen());
        }
        document.getElementById('overlayTitle').textContent = title;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Pas de forçage d'orientation — l'utilisateur tourne librement
        const rotateHint = document.getElementById('overlayRotateHint');
        if (rotateHint) rotateHint.style.display = 'none';

        if (this._overlayChart) { this._overlayChart.destroy(); this._overlayChart = null; }
        const origCfg = sourceChart.config;
        setTimeout(() => {
            const canvas = document.getElementById('chartOverlayCanvas');
            this._overlayChart = new Chart(canvas.getContext('2d'), {
                type: origCfg.type,
                data: JSON.parse(JSON.stringify(origCfg.data)),
                options: Object.assign({}, origCfg.options, { responsive:true, maintainAspectRatio:false }),
                plugins: origCfg.plugins || []
            });
        }, 50);
    }

    closeChartFullscreen() {
        const overlay = document.getElementById('chartOverlay');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
        if (this._overlayChart) { this._overlayChart.destroy(); this._overlayChart = null; }
    }

    openMatrixFullscreen(cid, circuit) {
        const matrixWrap = document.getElementById('matrix-' + cid);
        if (!matrixWrap) return;
        let overlay = document.getElementById('matrixOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'matrixOverlay';
            overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:#0a0a0a;z-index:9999;overflow-y:auto;padding:16px;box-sizing:border-box;';
            overlay.innerHTML = `
                <div style="max-width:700px;margin:0 auto;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <span style="font-size:0.85em;font-weight:700;color:#ccc;" id="matrixOverlayTitle"></span>
                        <button id="matrixOverlayClose" style="background:#1a1a1a;border:1px solid #333;border-radius:8px;color:#ccc;font-size:1em;padding:6px 14px;cursor:pointer;">✕ Fermer</button>
                    </div>
                    <div id="matrixOverlayContent"></div>
                </div>`;
            document.body.appendChild(overlay);
            document.getElementById('matrixOverlayClose').addEventListener('click', () => {
                overlay.style.display = 'none';
                document.body.style.overflow = '';
            });
        }
        document.getElementById('matrixOverlayTitle').textContent = '⚙️ Matrice pression pneu — ' + circuit;
        // Clone la matrice avec une version agrandie
        const content = document.getElementById('matrixOverlayContent');
        content.innerHTML = matrixWrap.innerHTML;
        // Agrandir les cellules
        content.querySelectorAll('.ct-matrix-cell').forEach(c => { c.style.minWidth = '90px'; c.style.padding = '10px 8px'; });
        content.querySelectorAll('.ct-matrix-time').forEach(c => { c.style.fontSize = '0.9em'; });
        content.querySelectorAll('.ct-matrix-n').forEach(c => { c.style.fontSize = '0.65em'; });
        content.querySelectorAll('.ct-matrix-table th').forEach(c => { c.style.fontSize = '0.7em'; });
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
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
        document.getElementById('manageCircuitBtn').addEventListener('click', () => this.openCircuitManager());
        document.getElementById('closeCircuitManagerBtn').addEventListener('click', () => {
            document.getElementById('circuitManagerModal').style.display = 'none';
        });
        document.getElementById('circuitManagerModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('circuitManagerModal')) {
                document.getElementById('circuitManagerModal').style.display = 'none';
            }
        });

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

// ============================================
// KARTING DASHBOARD - Version 3.0 avec Firebase
// Compatible file:// et GitHub Pages
// ============================================

// Configuration Firebase (compat version - sans modules)
const firebaseConfig = {
  apiKey: "AIzaSyBGSE2GfzcdftqmWKdJp_gOAqwFpxLTaQs",
  authDomain: "karting-95b36.firebaseapp.com",
  projectId: "karting-95b36",
  storageBucket: "karting-95b36.firebasestorage.app",
  messagingSenderId: "156441842966",
  appId: "1:156441842966:web:980d7093b0ca0296a1ec37"
};

// Initialiser Firebase
let auth, db;
try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log('✅ Firebase initialisé');
} catch (error) {
    console.error('❌ Erreur Firebase:', error);
}

class KartingDashboard {
    constructor() {
        this.sessions = [];  // Vide au départ
        this.circuits = [];  // Vide au départ
        this.profile = { pilotName: '', kartType: '', kartEngine: '' };  // Vide au départ
        this.theme = this.loadTheme();  // Le thème reste local
        this.circuitCharts = {};
        this.editingId = null;
        this.selectedCircuit = 'all';
        this.currentUser = null;
        this.isAuthMode = true; // true = connexion, false = inscription
        this.isInitialized = false;
        this.init();
    }

    init() {
        this.applyThemeOnLoad();
        this.setupEventListeners();
        this.setupFirebaseAuth();
        this.loadThemeSettings();
        // Les autres initialisations se feront APRÈS connexion
    }

    setTodayDate() {
        const dateInput = document.getElementById('date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    setCurrentTime() {
        const timeInput = document.getElementById('time');
        if (!timeInput) return;
        
        // Toujours mettre l'heure ACTUELLE (pas l'heure de connexion)
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    }

    formatTime(seconds) {
        if (seconds >= 60) {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            const ms = Math.floor((seconds % 1) * 1000);
            return `${minutes}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}m`;
        } else {
            const secs = Math.floor(seconds);
            const ms = Math.floor((seconds % 1) * 1000);
            return `${secs}.${String(ms).padStart(3, '0')}s`;
        }
    }

    setupEventListeners() {
        const form = document.getElementById('sessionForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSession();
        });

        const addCircuitBtn = document.getElementById('addCircuitBtn');
        addCircuitBtn.addEventListener('click', () => {
            this.addNewCircuit();
        });

        const cancelEditBtn = document.getElementById('cancelEditBtn');
        cancelEditBtn.addEventListener('click', () => {
            this.cancelEdit();
        });

        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                this.switchView(view);
            });
        });

        const profileForm = document.getElementById('profileForm');
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });

        const clearDataBtn = document.getElementById('clearAllData');
        clearDataBtn.addEventListener('click', () => {
            this.clearAllData();
        });

        const themeMode = document.getElementById('themeMode');
        themeMode.addEventListener('change', () => {
            this.saveTheme();
        });

        const circuitFilter = document.getElementById('circuitFilter');
        circuitFilter.addEventListener('change', (e) => {
            this.selectedCircuit = e.target.value;
            this.updateCircuitsAnalysis();
        });

        // Bouton Déconnexion
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    // Firebase Auth Setup
    setupFirebaseAuth() {
        if (!auth) {
            alert('Erreur : Firebase non disponible. Vérifiez votre connexion Internet.');
            return;
        }

        // Observer l'état d'authentification
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            if (user) {
                // Utilisateur connecté - Charger l'app
                this.closeAuthModal();
                this.initializeApp();
            } else {
                // Utilisateur NON connecté - Afficher popup obligatoire
                this.showMandatoryLogin();
            }
        });

        // Bouton Google Sign-In
        document.getElementById('googleSignInBtn')?.addEventListener('click', () => {
            this.signInWithGoogle();
        });

        // Formulaire Email/Password
        document.getElementById('authForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailAuth();
        });

        // Toggle Connexion/Inscription
        document.getElementById('authToggleBtn')?.addEventListener('click', () => {
            this.toggleAuthMode();
        });
    }

    showMandatoryLogin() {
        // Cacher le contenu de l'app
        document.querySelectorAll('.view-section').forEach(s => s.style.display = 'none');
        document.querySelector('.main-nav').style.display = 'none';
        
        // Afficher la modal de connexion (non fermable)
        const modal = document.getElementById('authModal');
        modal.style.display = 'block';
        
        // Cacher le bouton de fermeture
        const closeBtn = modal.querySelector('.modal-close-btn');
        if (closeBtn) closeBtn.style.display = 'none';
        
        // Changer le texte
        const title = modal.querySelector('h3');
        if (title) title.textContent = '🔐 Connexion Requise';
        
        const description = modal.querySelector('.auth-modal-body p');
        if (description) {
            description.textContent = '⚠️ Vous devez vous connecter pour utiliser Karting Dashboard';
            description.style.color = '#ff6b6b';
        }
    }

    initializeApp() {
        if (this.isInitialized) return;
        
        // Montrer l'app
        document.querySelector('.main-nav').style.display = 'flex';
        document.querySelector('[data-view="dashboard"]').style.display = 'block';
        
        // Charger TOUT depuis Firebase
        this.loadFromFirebase().then(() => {
            this.populateCircuits();
            this.populateCircuitFilter();
            this.updateDashboard();
            this.setTodayDate();
            this.setCurrentTime();
            this.displayProfile();
            this.isInitialized = true;
            
            // Vérifier si profil vide → forcer remplissage
            this.checkProfileCompletion();
        });
    }

    checkProfileCompletion() {
        if (!this.profile.pilotName || !this.profile.kartType || !this.profile.kartEngine) {
            // Profil incomplet - afficher modale obligatoire
            this.showMandatoryProfile();
        }
    }

    showMandatoryProfile() {
        this.switchView('settings');
        const settingsSection = document.querySelector('[data-view="settings"]');
        
        // Ajouter message d'avertissement
        const existingWarning = settingsSection.querySelector('.profile-warning');
        if (!existingWarning) {
            const warning = document.createElement('div');
            warning.className = 'profile-warning';
            warning.innerHTML = `
                <p style="background: #ff6b6b; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    ⚠️ <strong>Veuillez compléter votre profil pour continuer</strong><br>
                    <small>Ces informations sont nécessaires pour personnaliser votre dashboard</small>
                </p>
            `;
            settingsSection.insertBefore(warning, settingsSection.querySelector('.settings-section'));
        }
        
        // Désactiver navigation tant que profil non rempli
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    }

    enableNavigation() {
        // Réactiver navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        
        // Supprimer warning
        const warning = document.querySelector('.profile-warning');
        if (warning) warning.remove();
        
        this.switchView('dashboard');
    }

    openAuthModal() {
        document.getElementById('authModal').style.display = 'block';
    }

    closeAuthModal() {
        // Ne fermer que si l'utilisateur est connecté
        if (!this.currentUser) return;
        
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('authForm')?.reset();
        
        // Réafficher le bouton close
        const closeBtn = document.querySelector('.modal-close-btn');
        if (closeBtn) closeBtn.style.display = 'block';
    }

    toggleAuthMode() {
        this.isAuthMode = !this.isAuthMode;
        const submitBtn = document.getElementById('authSubmitBtn');
        const toggleBtn = document.getElementById('authToggleBtn');
        
        if (this.isAuthMode) {
            submitBtn.textContent = 'Se connecter';
            toggleBtn.textContent = 'Créer un compte';
        } else {
            submitBtn.textContent = 'Créer un compte';
            toggleBtn.textContent = 'J\'ai déjà un compte';
        }
    }

    async signInWithGoogle() {
        if (!auth) return;
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
            this.showNotification('Connexion réussie ! 🎉', 'success');
            this.closeAuthModal();
        } catch (error) {
            console.error('Erreur Google:', error);
            this.showNotification('Erreur : ' + error.message, 'error');
        }
    }

    async handleEmailAuth() {
        if (!auth) return;
        
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;

        try {
            if (this.isAuthMode) {
                await auth.signInWithEmailAndPassword(email, password);
                this.showNotification('Connexion réussie ! 🎉', 'success');
            } else {
                await auth.createUserWithEmailAndPassword(email, password);
                this.showNotification('Compte créé ! 🎉', 'success');
            }
            this.closeAuthModal();
        } catch (error) {
            let message = 'Erreur : ';
            if (error.code === 'auth/email-already-in-use') message += 'E-mail déjà utilisé';
            else if (error.code === 'auth/weak-password') message += 'Mot de passe trop faible';
            else if (error.code === 'auth/user-not-found') message += 'Utilisateur introuvable';
            else if (error.code === 'auth/wrong-password') message += 'Mot de passe incorrect';
            else message += error.message;
            this.showNotification(message, 'error');
        }
    }

    async saveToFirebase() {
        if (!this.currentUser || !db) return;

        try {
            const userId = this.currentUser.uid;
            
            for (const session of this.sessions) {
                await db.collection('users').doc(userId).collection('sessions').doc(String(session.id)).set(session);
            }

            await db.collection('users').doc(userId).collection('profile').doc('data').set(this.profile);
        } catch (error) {
            console.error('Erreur sauvegarde Firebase:', error);
        }
    }

    async loadFromFirebase() {
        if (!this.currentUser || !db) return;

        try {
            const userId = this.currentUser.uid;

            const sessionsSnap = await db.collection('users').doc(userId).collection('sessions').get();
            
            if (!sessionsSnap.empty) {
                this.sessions = [];
                sessionsSnap.forEach((doc) => {
                    this.sessions.push(doc.data());
                });
            }

            const profileDoc = await db.collection('users').doc(userId).collection('profile').doc('data').get();
            if (profileDoc.exists) {
                this.profile = profileDoc.data();
            }

            // Charger les circuits
            await this.loadCircuitsFromFirebase();

            this.updateDashboard();
            this.displayProfile();
            this.populateCircuitFilter();
            
            this.showNotification('Données synchronisées ! ☁️', 'success');
        } catch (error) {
            console.error('Erreur chargement Firebase:', error);
        }
    }

    addSession() {
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const circuit = document.getElementById('circuit').value;
        const bestTime = parseFloat(document.getElementById('bestTime').value);
        const lapsCount = parseInt(document.getElementById('lapsCount').value);
        const maxLaps = document.getElementById('maxLaps').value ? parseInt(document.getElementById('maxLaps').value) : null;
        const crownUsed = document.getElementById('crownUsed').value;
        const weather = document.getElementById('weather').value;
        const temperature = document.getElementById('temperature').value;
        const tireType = document.getElementById('tireType').value;
        const tirePressure = document.getElementById('tirePressure').value;
        const notes = document.getElementById('notes').value;

        if (this.editingId) {
            const session = this.sessions.find(s => s.id === this.editingId);
            if (session) {
                session.date = date;
                session.time = time;
                session.circuit = circuit;
                session.bestTime = bestTime;
                session.lapsCount = lapsCount;
                session.maxLaps = maxLaps;
                session.crownUsed = crownUsed;
                session.weather = weather;
                session.temperature = temperature;
                session.tireType = tireType;
                session.tirePressure = tirePressure;
                session.notes = notes;
                this.showNotification('Session modifiée ! ✏️');
                this.editingId = null;
                document.getElementById('submitBtn').textContent = '📊 Enregistrer la session';
                document.getElementById('cancelEditBtn').style.display = 'none';
            }
        } else {
            // Vérifier si c'est un record AVANT d'ajouter
            const isNewRecord = this.checkIfNewRecord(circuit, bestTime);
            
            const session = {
                id: Date.now(),
                date, time, circuit, bestTime, lapsCount, maxLaps, crownUsed,
                weather, temperature, tireType, tirePressure, notes
            };
            this.sessions.push(session);
            
            // Si record, popup spécial !
            if (isNewRecord) {
                this.showRecordPopup(circuit, bestTime);
            } else {
                this.showNotification('Session ajoutée ! 🎉');
            }
        }

        this.saveSessions();
        this.updateDashboard();
        this.populateCircuitFilter();
        this.clearForm();
        this.switchView('dashboard');
    }

    checkIfNewRecord(circuit, newTime) {
        // Trouver toutes les sessions sur ce circuit (sauf la nouvelle)
        const circuitSessions = this.sessions.filter(s => s.circuit === circuit);
        
        // Si première session sur ce circuit = record automatique
        if (circuitSessions.length === 0) {
            return true;
        }
        
        // Trouver l'ancien record
        const oldRecord = Math.min(...circuitSessions.map(s => s.bestTime));
        
        // Nouveau record si temps inférieur
        return newTime < oldRecord;
    }

    showRecordPopup(circuit, time) {
        const formattedTime = this.formatTime(time);
        
        // Créer popup personnalisée
        const popup = document.createElement('div');
        popup.className = 'record-popup';
        popup.innerHTML = `
            <div class="record-popup-content">
                <div class="record-popup-icon">🏆</div>
                <h2>NOUVEAU RECORD !</h2>
                <p class="record-circuit">🏁 ${circuit}</p>
                <p class="record-time">${formattedTime}</p>
                <p class="record-message">Félicitations ! Vous avez battu votre meilleur temps ! 🎉</p>
                <button class="btn-primary" onclick="this.parentElement.parentElement.remove()">✅ Super !</button>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Supprimer automatiquement après 5 secondes
        setTimeout(() => {
            if (popup.parentElement) popup.remove();
        }, 5000);
    }

    editSession(id) {
        const session = this.sessions.find(s => s.id === id);
        if (session) {
            document.getElementById('date').value = session.date;
            document.getElementById('time').value = session.time || '14:00';
            document.getElementById('circuit').value = session.circuit;
            document.getElementById('bestTime').value = session.bestTime;
            document.getElementById('lapsCount').value = session.lapsCount || '';
            document.getElementById('maxLaps').value = session.maxLaps || '';
            document.getElementById('crownUsed').value = session.crownUsed || '';
            document.getElementById('weather').value = session.weather || '';
            document.getElementById('temperature').value = session.temperature || '';
            document.getElementById('tireType').value = session.tireType || '';
            document.getElementById('tirePressure').value = session.tirePressure || '';
            document.getElementById('notes').value = session.notes || '';
            
            this.editingId = id;
            document.getElementById('submitBtn').textContent = '✏️ Enregistrer les modifications';
            document.getElementById('cancelEditBtn').style.display = 'block';
            
            this.switchView('add-session');
            window.scrollTo(0, 0);
        }
    }

    async deleteSession(id) {
        if (confirm('Supprimer cette session ?')) {
            // Supprimer localement
            this.sessions = this.sessions.filter(s => s.id !== id);
            
            // Supprimer dans Firebase
            if (this.currentUser && db) {
                try {
                    const userId = this.currentUser.uid;
                    await db.collection('users').doc(userId).collection('sessions').doc(String(id)).delete();
                    console.log('✅ Session supprimée de Firebase');
                } catch (error) {
                    console.error('❌ Erreur suppression Firebase:', error);
                }
            }
            
            this.updateDashboard();
            this.populateCircuitFilter();
            this.showNotification('Session supprimée', 'error');
        }
    }

    cancelEdit() {
        this.clearForm();
        this.switchView('dashboard');
        this.showNotification('Annulé', 'error');
    }

    showSessionDetails(id) {
        const session = this.sessions.find(s => s.id === id);
        if (!session) return;

        const details = `
            <div class="session-detail-row">
                <span class="session-detail-label">📅 Date</span>
                <span class="session-detail-value">${this.formatDate(session.date)}</span>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">🕐 Heure</span>
                <span class="session-detail-value">${session.time || '-'}</span>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">🏁 Circuit</span>
                <span class="session-detail-value">${session.circuit}</span>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">⏱️ Meilleur temps</span>
                <span class="session-detail-value">${this.formatTime(session.bestTime)}</span>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">🔢 Tours</span>
                <span class="session-detail-value">${session.lapsCount || '-'}</span>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">🏎️ Tours minutes moteur</span>
                <span class="session-detail-value">${session.maxLaps || '-'}</span>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">⚙️ Couronne</span>
                <span class="session-detail-value">${session.crownUsed || '-'}</span>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">🌦️ Météo</span>
                <span class="session-detail-value">${session.weather || '-'}</span>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">🌡️ Température</span>
                <span class="session-detail-value">${session.temperature ? session.temperature + '°C' : '-'}</span>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">🛞 Pneus</span>
                <span class="session-detail-value">${session.tireType || '-'}</span>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">⚡ Pression</span>
                <span class="session-detail-value">${session.tirePressure ? session.tirePressure + ' bar' : '-'}</span>
            </div>
            ${session.notes ? `
            <div class="session-detail-row">
                <span class="session-detail-label">📝 Notes</span>
                <span class="session-detail-value">${session.notes}</span>
            </div>
            ` : ''}
        `;

        document.getElementById('sessionDetailsContent').innerHTML = details;
        document.getElementById('sessionModal').style.display = 'block';
    }

    closeSessionDetails() {
        document.getElementById('sessionModal').style.display = 'none';
    }

    async logout() {
        if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
            try {
                await auth.signOut();
                this.showNotification('Déconnexion réussie', 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                console.error('Erreur déconnexion:', error);
                this.showNotification('Erreur lors de la déconnexion', 'error');
            }
        }
    }

    async saveSessions() {
        // Sauvegarder dans Firebase
        if (this.currentUser && db) {
            await this.saveToFirebase();
        }
    }

    loadSessions() {
        // Chargé depuis Firebase uniquement
        return [];
    }

    loadCircuits() {
        // Chargé depuis Firebase uniquement
        return [];
    }

    saveCircuits() {
        // Plus de localStorage - uniquement Firebase
        if (this.currentUser) this.saveCircuitsToFirebase();
    }

    async saveCircuitsToFirebase() {
        if (!this.currentUser || !db) return;
        try {
            const userId = this.currentUser.uid;
            await db.collection('users').doc(userId).collection('settings').doc('circuits').set({
                list: this.circuits
            });
        } catch (error) {
            console.error('Erreur sauvegarde circuits Firebase:', error);
        }
    }

    async loadCircuitsFromFirebase() {
        if (!this.currentUser || !db) return;
        try {
            const userId = this.currentUser.uid;
            const circuitsDoc = await db.collection('users').doc(userId).collection('settings').doc('circuits').get();
            
            if (circuitsDoc.exists) {
                this.circuits = circuitsDoc.data().list || [];
            } else {
                // Première connexion - circuits par défaut
                this.circuits = ['Mariembourg', 'Genk', 'Spa'];
                await this.saveCircuitsToFirebase();
            }
            this.populateCircuits();
            console.log('✅ Circuits chargés depuis Firebase');
        } catch (error) {
            console.error('Erreur chargement circuits Firebase:', error);
        }
    }

    loadProfile() {
        // Chargé depuis Firebase uniquement
        return { pilotName: '', kartType: '', kartEngine: '' };
    }

    saveProfile() {
        this.profile.pilotName = document.getElementById('pilotName').value;
        this.profile.kartType = document.getElementById('kartType').value;
        this.profile.kartEngine = document.getElementById('kartEngine').value;

        // Vérifier que tout est rempli
        if (!this.profile.pilotName || !this.profile.kartType || !this.profile.kartEngine) {
            this.showNotification('⚠️ Veuillez remplir tous les champs !', 'error');
            return;
        }

        // Sauvegarder dans Firebase
        this.displayProfile();
        this.showNotification('Profil enregistré ! 👤');
        if (this.currentUser) {
            this.saveToFirebase().then(() => {
                // Réactiver navigation si c'était le premier remplissage
                this.enableNavigation();
            });
        }
    }

    loadTheme() {
        const mode = localStorage.getItem('themeMode') || 'dark';
        return { mode };
    }

    async clearAllData() {
        // Compteur de sessions
        const sessionCount = this.sessions.length;
        
        // Premier warning avec compteur
        if (!confirm(`⚠️ SUPPRIMER DÉFINITIVEMENT MON COMPTE ?

Cette action va supprimer :
• ${sessionCount} session${sessionCount > 1 ? 's' : ''}
• Votre profil pilote
• Vos circuits personnalisés

⚠️ IMPOSSIBLE À ANNULER - PERTE DÉFINITIVE

Voulez-vous continuer ?`)) {
            return;
        }
        
        // Demander confirmation par nom
        const confirmation = prompt('Pour confirmer, tapez votre nom de pilote :');
        if (confirmation !== this.profile.pilotName) {
            this.showNotification('❌ Nom incorrect. Suppression annulée.', 'error');
            return;
        }
        
        // Suppression
        if (this.currentUser && db) {
            try {
                const userId = this.currentUser.uid;
                
                this.showNotification('🗑️ Suppression en cours...', 'error');
                
                // Supprimer toutes les sessions
                const sessionsRef = await db.collection('users').doc(userId).collection('sessions').get();
                const deletePromises = [];
                sessionsRef.forEach(doc => {
                    deletePromises.push(doc.ref.delete());
                });
                await Promise.all(deletePromises);
                
                // Supprimer profil et circuits
                await db.collection('users').doc(userId).collection('profile').doc('data').delete();
                await db.collection('users').doc(userId).collection('settings').doc('circuits').delete();
                
                this.showNotification('✅ Compte supprimé. Déconnexion...', 'success');
                
                setTimeout(() => {
                    auth.signOut().then(() => location.reload());
                }, 2000);
                
            } catch (error) {
                console.error('❌ Erreur suppression:', error);
                this.showNotification('❌ Erreur lors de la suppression', 'error');
            }
        }
    }

    displayProfile() {
        const headerName = document.getElementById('headerPilotName');
        const headerKart = document.getElementById('headerKartType');
        const headerEngine = document.getElementById('headerKartEngine');
        
        if (headerName) headerName.textContent = this.profile.pilotName || '-';
        if (headerKart) headerKart.textContent = this.profile.kartType || '-';
        if (headerEngine) headerEngine.textContent = this.profile.kartEngine || '-';

        // Remplir les champs du formulaire profil (dans Réglages)
        const pilotNameInput = document.getElementById('pilotName');
        const kartTypeInput = document.getElementById('kartType');
        const kartEngineInput = document.getElementById('kartEngine');
        
        if (pilotNameInput) pilotNameInput.value = this.profile.pilotName || '';
        if (kartTypeInput) kartTypeInput.value = this.profile.kartType || '';
        if (kartEngineInput) kartEngineInput.value = this.profile.kartEngine || '';
    }

    loadThemeSettings() {
        document.getElementById('themeMode').value = this.theme.mode;
    }

    applyThemeOnLoad() {
        const body = document.body;
        if (this.theme.mode === 'light') {
            body.style.background = '#f5f5f5';
            body.style.color = '#000';
        } else {
            body.style.background = '#0a0a0a';
            body.style.color = '#fff';
        }
    }

    saveTheme() {
        const mode = document.getElementById('themeMode').value;
        this.theme.mode = mode;
        localStorage.setItem('themeMode', mode);
        this.applyThemeOnLoad();
        this.showNotification('Thème appliqué ! ✅');
    }

    populateCircuits() {
        const select = document.getElementById('circuit');
        select.innerHTML = '<option value="">-- Sélectionnez --</option>';
        
        [...this.circuits].sort().forEach(circuit => {
            const option = document.createElement('option');
            option.value = circuit;
            option.textContent = circuit;
            select.appendChild(option);
        });
    }

    populateCircuitFilter() {
        const select = document.getElementById('circuitFilter');
        select.innerHTML = '<option value="all">Tous les circuits</option>';
        
        [...new Set(this.sessions.map(s => s.circuit))].sort().forEach(circuit => {
            const option = document.createElement('option');
            option.value = circuit;
            option.textContent = circuit;
            select.appendChild(option);
        });
    }

    addNewCircuit() {
        const name = prompt('Nom du circuit :');
        if (name && name.trim()) {
            const trimmed = name.trim();
            if (this.circuits.includes(trimmed)) {
                alert('Circuit déjà existant !');
                return;
            }
            this.circuits.push(trimmed);
            this.saveCircuits();
            this.populateCircuits();
            document.getElementById('circuit').value = trimmed;
            this.showNotification(`Circuit "${trimmed}" ajouté ! 🏁`);
        }
    }

    updateDashboard() {
        this.updateDashboardStats();
        this.updateRecentSessions();
        this.updateCircuitsAnalysis();
        this.displaySessions();
    }

    updateDashboardStats() {
        const total = this.sessions.length;
        document.getElementById('dashTotalSessions').textContent = total;

        if (total === 0) {
            document.getElementById('dashFavoriteCircuit').textContent = '-';
            document.getElementById('dashFavoriteCircuitBest').textContent = '-';
            document.getElementById('dashCircuitsCount').textContent = '0';
            document.getElementById('dashTotalLaps').textContent = '0';
            return;
        }

        const circuitLaps = {};
        this.sessions.forEach(s => {
            if (!circuitLaps[s.circuit]) {
                circuitLaps[s.circuit] = { laps: 0, bestTime: Infinity };
            }
            circuitLaps[s.circuit].laps += s.lapsCount || 0;
            if (s.bestTime < circuitLaps[s.circuit].bestTime) {
                circuitLaps[s.circuit].bestTime = s.bestTime;
            }
        });

        const favorite = Object.keys(circuitLaps).reduce((a, b) => 
            circuitLaps[a].laps > circuitLaps[b].laps ? a : b
        );

        document.getElementById('dashFavoriteCircuit').textContent = favorite;
        document.getElementById('dashFavoriteCircuitBest').textContent = 
            `Meilleur: ${this.formatTime(circuitLaps[favorite].bestTime)}`;

        document.getElementById('dashCircuitsCount').textContent = new Set(this.sessions.map(s => s.circuit)).size;
        document.getElementById('dashTotalLaps').textContent = this.sessions.reduce((sum, s) => sum + (s.lapsCount || 0), 0);
    }

    updateRecentSessions() {
        const container = document.getElementById('recentSessionsList');
        
        if (this.sessions.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Aucune session</p></div>';
            return;
        }

        const recent = [...this.sessions]
            .sort((a, b) => {
                const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
                const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
                return dateB - dateA;
            })
            .slice(0, 5);

        container.innerHTML = recent.map(s => {
            const details = [];
            if (s.lapsCount) details.push(`${s.lapsCount} tours`);
            if (s.weather) details.push(s.weather);
            if (s.tirePressure) details.push(`${s.tirePressure} bar`);
            
            return `
                <div class="session-item">
                    <div class="session-info">
                        <span class="session-date">${this.formatDateShort(s.date)} ${s.time || ''}</span>
                        <span class="session-circuit">📍 ${s.circuit}</span>
                        <span class="session-time">${this.formatTime(s.bestTime)}</span>
                        <span class="session-notes">${details.join(' • ') || '-'}</span>
                    </div>
                    <div class="session-actions">
                        <button class="btn-details" onclick="dashboard.showSessionDetails(${s.id})">👁️</button>
                        <button class="btn-edit" onclick="dashboard.editSession(${s.id})">✏️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateCircuitsAnalysis() {
        const container = document.getElementById('circuitsAnalysis');
        
        if (this.sessions.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>🏎️ Aucune donnée</p></div>';
            return;
        }

        const circuitData = {};
        this.sessions.forEach(s => {
            if (!circuitData[s.circuit]) circuitData[s.circuit] = [];
            circuitData[s.circuit].push(s);
        });

        let circuits = Object.keys(circuitData).sort();
        if (this.selectedCircuit !== 'all') {
            circuits = circuits.filter(c => c === this.selectedCircuit);
        }

        container.innerHTML = '';
        circuits.forEach(circuit => {
            const sessions = circuitData[circuit];
            const sorted = sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            const bestTime = Math.min(...sessions.map(s => s.bestTime));
            const avgTime = sessions.reduce((sum, s) => sum + s.bestTime, 0) / sessions.length;
            const totalLaps = sessions.reduce((sum, s) => sum + (s.lapsCount || 0), 0);
            const totalSessions = sessions.length;
            
            const bestSession = sessions.find(s => s.bestTime === bestTime);
            
            // Créer résumé conditions
            const conditions = [];
            if (bestSession.weather) conditions.push(bestSession.weather);
            if (bestSession.tireType) conditions.push(`Pneus: ${bestSession.tireType}`);
            if (bestSession.tirePressure) conditions.push(`${bestSession.tirePressure} bar`);
            if (bestSession.maxLaps) conditions.push(`${bestSession.maxLaps} tours moteur`);
            const conditionsText = conditions.join(' • ');
            
            const tile = document.createElement('div');
            tile.className = 'circuit-tile';
            tile.innerHTML = `
                <div class="circuit-tile-header">
                    <div class="circuit-tile-left">
                        <div class="circuit-tile-name">🏁 ${circuit}</div>
                        <div class="circuit-best-time-line">
                            <span>Mon meilleur temps :</span>
                            <span class="circuit-best-time-value">${this.formatTime(bestTime)}</span>
                            <button class="btn-view-record-inline" onclick="dashboard.showSessionDetails(${bestSession.id})">👁️ Détails</button>
                        </div>
                        <div class="circuit-conditions-summary">${conditionsText}</div>
                    </div>
                </div>
                <div class="circuit-tile-content">
                    <div class="circuit-tile-chart">
                        <canvas id="chart-${circuit.replace(/\s+/g, '-')}"></canvas>
                    </div>
                    <div class="circuit-tile-stats">
                        <div class="circuit-mini-stat">
                            <div class="circuit-mini-stat-label">Sessions</div>
                            <div class="circuit-mini-stat-value">${totalSessions}</div>
                        </div>
                        <div class="circuit-mini-stat">
                            <div class="circuit-mini-stat-label">Temps moyen</div>
                            <div class="circuit-mini-stat-value">${this.formatTime(avgTime)}</div>
                        </div>
                        <div class="circuit-mini-stat">
                            <div class="circuit-mini-stat-label">Tours totaux</div>
                            <div class="circuit-mini-stat-value">${totalLaps}</div>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(tile);
            setTimeout(() => this.createCircuitChart(circuit, sorted), 100);
        });
    }

    createCircuitChart(circuit, sessions) {
        const canvas = document.getElementById(`chart-${circuit.replace(/\s+/g, '-')}`);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const labels = sessions.map(s => {
            const d = new Date(s.date);
            return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        });
        
        if (this.circuitCharts[circuit]) this.circuitCharts[circuit].destroy();
        
        this.circuitCharts[circuit] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Temps',
                    data: sessions.map(s => s.bestTime),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const s = sessions[ctx.dataIndex];
                                return [
                                    `Temps: ${this.formatTime(s.bestTime)}`,
                                    s.weather ? `Météo: ${s.weather}` : '',
                                    s.lapsCount ? `Tours: ${s.lapsCount}` : ''
                                ].filter(Boolean);
                            }
                        },
                        backgroundColor: '#1a1a1a',
                        titleColor: '#fff',
                        bodyColor: '#ccc',
                        borderColor: '#444',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: (v) => this.formatTime(v),
                            color: '#999'
                        },
                        grid: { color: '#2a2a2a' }
                    },
                    x: {
                        ticks: { color: '#999' },
                        grid: { color: '#2a2a2a' }
                    }
                }
            }
        });
    }

    displaySessions() {
        const container = document.getElementById('sessionsList');
        
        if (this.sessions.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>🏎️ Aucune session</p></div>';
            return;
        }

        const sorted = [...this.sessions].sort((a, b) => {
            const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
            const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
            return dateB - dateA;
        });

        container.innerHTML = sorted.map(s => {
            const details = [];
            if (s.lapsCount) details.push(`${s.lapsCount} tours`);
            if (s.weather) details.push(s.weather);
            if (s.tirePressure) details.push(`${s.tirePressure} bar`);
            
            return `
            <div class="session-item">
                <div class="session-info">
                    <span class="session-date">${this.formatDateShort(s.date)} ${s.time || ''}</span>
                    <span class="session-circuit">📍 ${s.circuit}</span>
                    <span class="session-time">${this.formatTime(s.bestTime)}</span>
                    <span class="session-notes">${details.join(' • ') || '-'}</span>
                </div>
                <div class="session-actions">
                    <button class="btn-details" onclick="dashboard.showSessionDetails(${s.id})">👁️</button>
                    <button class="btn-edit" onclick="dashboard.editSession(${s.id})">✏️</button>
                    <button class="btn-delete" onclick="dashboard.deleteSession(${s.id})">🗑️</button>
                </div>
            </div>
        `;
        }).join('');
    }

    switchView(view) {
        document.querySelectorAll('.view-section').forEach(s => s.style.display = 'none');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        document.querySelectorAll(`[data-view="${view}"]`).forEach(el => {
            if (el.classList.contains('view-section')) el.style.display = 'block';
            if (el.classList.contains('nav-btn')) el.classList.add('active');
        });
        
        // Mettre à jour l'heure si on va dans add-session
        if (view === 'add-session') {
            this.setCurrentTime();
        }
        
        // Afficher le profil si on va dans settings
        if (view === 'settings') {
            this.displayProfile();
        }
    }

    formatDate(dateString) {
        const d = new Date(dateString);
        return d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    formatDateShort(dateString) {
        const d = new Date(dateString);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    clearForm() {
        document.getElementById('sessionForm').reset();
        this.setTodayDate();
        this.setCurrentTime();
        this.editingId = null;
        document.getElementById('submitBtn').textContent = '📊 Enregistrer la session';
        document.getElementById('cancelEditBtn').style.display = 'none';
    }

    showNotification(message, type = 'success') {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 3000;
            animation: slideIn 0.3s ease-out;
        `;
        notif.textContent = message;

        if (!document.querySelector('style[data-notif]')) {
            const style = document.createElement('style');
            style.setAttribute('data-notif', 'true');
            style.textContent = '@keyframes slideIn{from{transform:translateX(400px);opacity:0}to{transform:translateX(0);opacity:1}}';
            document.head.appendChild(style);
        }

        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }
}

let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new KartingDashboard();
});

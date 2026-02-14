// Classe pour gérer les sessions de karting
class KartingDashboard {
    constructor() {
        this.sessions = this.loadSessions();
        this.circuits = this.loadCircuits();
        this.profile = this.loadProfile();
        this.theme = this.loadTheme();
        this.circuitCharts = {};
        this.editingId = null;
        this.init();
    }

    init() {
        this.applyThemeOnLoad();
        this.setupEventListeners();
        this.populateCircuits();
        this.updateDashboard();
        this.setTodayDate();
        this.displayProfile();
        this.loadThemeSettings();
    }

    setTodayDate() {
        const dateInput = document.getElementById('date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
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

        // Bouton Annuler (retour au dashboard)
        const cancelSessionBtn = document.getElementById('cancelSessionBtn');
        cancelSessionBtn.addEventListener('click', () => {
            this.clearForm();
            this.switchView('dashboard');
        });

        // Gestion du menu de navigation
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Formulaire de profil
        const profileForm = document.getElementById('profileForm');
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });

        // Bouton effacer données
        const clearDataBtn = document.getElementById('clearAllData');
        clearDataBtn.addEventListener('click', () => {
            this.clearAllData();
        });

        // Gestion des thèmes (simplifié)
        const themeMode = document.getElementById('themeMode');
        themeMode.addEventListener('change', () => {
            this.previewTheme();
        });

        const applyThemeBtn = document.getElementById('applyTheme');
        applyThemeBtn.addEventListener('click', () => {
            this.saveTheme();
        });
    }

    addSession() {
        const date = document.getElementById('date').value;
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

        // Si on est en mode édition
        if (this.editingId) {
            const session = this.sessions.find(s => s.id === this.editingId);
            if (session) {
                session.date = date;
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
                this.showNotification('Session modifiée avec succès ! ✏️');
                this.editingId = null;
                document.querySelector('.btn-primary').textContent = '📊 Enregistrer la session';
                document.getElementById('cancelEditBtn').style.display = 'none';
            }
        } else {
            // Mode ajout
            const session = {
                id: Date.now(),
                date: date,
                circuit: circuit,
                bestTime: bestTime,
                lapsCount: lapsCount,
                maxLaps: maxLaps,
                crownUsed: crownUsed,
                weather: weather,
                temperature: temperature,
                tireType: tireType,
                tirePressure: tirePressure,
                notes: notes
            };
            this.sessions.push(session);
            this.showNotification('Session ajoutée avec succès ! 🎉');
        }

        this.saveSessions();
        this.updateDashboard();
        this.clearForm();
        this.switchView('dashboard');
    }

    editSession(id) {
        const session = this.sessions.find(s => s.id === id);
        if (session) {
            document.getElementById('date').value = session.date;
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
            document.querySelector('.btn-primary').textContent = '✏️ Modifier la session';
            document.getElementById('cancelEditBtn').style.display = 'block';
            
            // Ouvrir la vue add-session
            this.switchView('add-session');
            
            // Scroll vers le haut
            window.scrollTo(0, 0);
        }
    }

    cancelEdit() {
        this.clearForm();
        this.switchView('dashboard');
        this.showNotification('Modification annulée', 'error');
    }

    deleteSession(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) {
            this.sessions = this.sessions.filter(session => session.id !== id);
            this.saveSessions();
            this.updateDashboard();
            this.showNotification('Session supprimée', 'error');
        }
    }

    saveSessions() {
        localStorage.setItem('kartingSessions', JSON.stringify(this.sessions));
    }

    loadSessions() {
        const saved = localStorage.getItem('kartingSessions');
        return saved ? JSON.parse(saved) : [];
    }

    loadCircuits() {
        const saved = localStorage.getItem('kartingCircuits');
        const defaultCircuits = ['Mariembourg', 'Genk', 'Spa'];
        return saved ? JSON.parse(saved) : defaultCircuits;
    }

    saveCircuits() {
        localStorage.setItem('kartingCircuits', JSON.stringify(this.circuits));
    }

    loadProfile() {
        const saved = localStorage.getItem('kartingProfile');
        return saved ? JSON.parse(saved) : {
            pilotName: '',
            kartType: '',
            kartEngine: '',
            kartCategory: '',
            pilotNumber: ''
        };
    }

    saveProfile() {
        this.profile.pilotName = document.getElementById('pilotName').value;
        this.profile.kartType = document.getElementById('kartType').value;
        this.profile.kartEngine = document.getElementById('kartEngine').value;
        this.profile.kartCategory = document.getElementById('kartCategory').value;
        this.profile.pilotNumber = document.getElementById('pilotNumber').value;

        localStorage.setItem('kartingProfile', JSON.stringify(this.profile));
        this.displayProfile();
        this.showNotification('Profil enregistré ! 👤');
    }

    displayProfile() {
        // Afficher dans le bandeau
        const bannerName = document.getElementById('bannerPilotName');
        const bannerKart = document.getElementById('bannerKartType');
        const bannerEngine = document.getElementById('bannerKartEngine');
        
        if (bannerName) bannerName.textContent = this.profile.pilotName || '-';
        if (bannerKart) bannerKart.textContent = this.profile.kartType || '-';
        if (bannerEngine) bannerEngine.textContent = this.profile.kartEngine || '-';

        // Remplir le formulaire profil
        document.getElementById('pilotName').value = this.profile.pilotName || '';
        document.getElementById('kartType').value = this.profile.kartType || '';
        document.getElementById('kartEngine').value = this.profile.kartEngine || '';
        document.getElementById('kartCategory').value = this.profile.kartCategory || '';
        document.getElementById('pilotNumber').value = this.profile.pilotNumber || '';
    }

    loadTheme() {
        const mode = localStorage.getItem('themeMode') || 'dark';
        return { mode };
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

    previewTheme() {
        const mode = document.getElementById('themeMode').value;
        const body = document.body;
        
        if (mode === 'light') {
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
        this.showNotification('Thème enregistré ! ✅', 'success');
    }

    populateCircuits() {
        const select = document.getElementById('circuit');
        select.innerHTML = '<option value="">-- Sélectionnez un circuit --</option>';
        
        const sortedCircuits = [...this.circuits].sort();
        sortedCircuits.forEach(circuit => {
            const option = document.createElement('option');
            option.value = circuit;
            option.textContent = circuit;
            select.appendChild(option);
        });
    }

    addNewCircuit() {
        const circuitName = prompt('Entrez le nom du nouveau circuit :');
        
        if (circuitName && circuitName.trim() !== '') {
            const trimmedName = circuitName.trim();
            
            if (this.circuits.includes(trimmedName)) {
                alert('Ce circuit existe déjà !');
                return;
            }
            
            this.circuits.push(trimmedName);
            this.saveCircuits();
            this.populateCircuits();
            
            document.getElementById('circuit').value = trimmedName;
            
            this.showNotification(`Circuit "${trimmedName}" ajouté ! 🏁`);
        }
    }

    clearAllData() {
        if (confirm('⚠️ Êtes-vous ABSOLUMENT sûr de vouloir effacer TOUTES vos données ?\n\nCette action est IRRÉVERSIBLE !')) {
            if (confirm('Dernière confirmation : Toutes vos sessions, circuits et profil seront supprimés définitivement.')) {
                localStorage.removeItem('kartingSessions');
                localStorage.removeItem('kartingCircuits');
                localStorage.removeItem('kartingProfile');
                
                this.sessions = [];
                this.circuits = ['Mariembourg', 'Genk', 'Spa'];
                this.profile = {
                    pilotName: '',
                    kartType: '',
                    kartEngine: '',
                    kartCategory: '',
                    pilotNumber: ''
                };
                
                this.populateCircuits();
                this.updateDashboard();
                this.displayProfile();
                
                this.showNotification('Toutes les données ont été effacées', 'error');
            }
        }
    }

    updateDashboard() {
        this.updateDashboardStats();
        this.updateRecentSessions();
        this.updateCircuitsAnalysis();
        this.displaySessions();
    }

    updateDashboardStats() {
        const totalSessions = this.sessions.length;
        document.getElementById('dashTotalSessions').textContent = totalSessions;

        if (totalSessions === 0) {
            document.getElementById('dashFavoriteCircuit').textContent = '-';
            document.getElementById('dashFavoriteCircuitBest').textContent = '-';
            document.getElementById('dashCircuitsCount').textContent = '0';
            document.getElementById('dashTotalLaps').textContent = '0';
            return;
        }

        // Circuit préféré (celui avec le plus de tours)
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

        const favoriteCircuit = Object.keys(circuitLaps).reduce((a, b) => 
            circuitLaps[a].laps > circuitLaps[b].laps ? a : b
        );

        document.getElementById('dashFavoriteCircuit').textContent = favoriteCircuit;
        document.getElementById('dashFavoriteCircuitBest').textContent = 
            `Meilleur: ${this.formatTime(circuitLaps[favoriteCircuit].bestTime)}`;

        // Circuits visités
        const uniqueCircuits = new Set(this.sessions.map(s => s.circuit));
        document.getElementById('dashCircuitsCount').textContent = uniqueCircuits.size;

        // Tours totaux
        const totalLaps = this.sessions.reduce((sum, s) => sum + (s.lapsCount || 0), 0);
        document.getElementById('dashTotalLaps').textContent = totalLaps;
    }

    updateRecentSessions() {
        const container = document.getElementById('recentSessionsList');
        
        if (this.sessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Aucune session pour le moment</p>
                </div>
            `;
            return;
        }

        const recentSessions = [...this.sessions]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        container.innerHTML = recentSessions.map(session => {
            const details = [];
            if (session.lapsCount) details.push(`${session.lapsCount} tours`);
            if (session.weather) details.push(session.weather);
            
            const detailsText = details.length > 0 ? details.join(' • ') : '-';
            
            return `
                <div class="session-item">
                    <div class="session-info">
                        <span class="session-date">${this.formatDateShort(session.date)}</span>
                        <span class="session-circuit">📍 ${session.circuit}</span>
                        <span class="session-time">${this.formatTime(session.bestTime)}</span>
                        <span class="session-notes">${detailsText}</span>
                    </div>
                    <div class="session-actions">
                        <button class="btn-edit" onclick="dashboard.editSession(${session.id})" title="Modifier">✏️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateCircuitsAnalysis() {
        const container = document.getElementById('circuitsAnalysis');
        
        if (this.sessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>🏎️ Aucune donnée disponible</p>
                    <p style="font-size: 0.9em;">Ajoutez des sessions pour voir l'analyse par circuit !</p>
                </div>
            `;
            return;
        }

        const circuitData = {};
        this.sessions.forEach(session => {
            if (!circuitData[session.circuit]) {
                circuitData[session.circuit] = [];
            }
            circuitData[session.circuit].push(session);
        });

        container.innerHTML = '';
        Object.keys(circuitData).sort().forEach(circuit => {
            const sessions = circuitData[circuit];
            const sortedSessions = sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            const bestTime = Math.min(...sessions.map(s => s.bestTime));
            const avgTime = sessions.reduce((sum, s) => sum + s.bestTime, 0) / sessions.length;
            const totalLaps = sessions.reduce((sum, s) => sum + (s.lapsCount || 0), 0);
            const totalSessions = sessions.length;
            
            const bestSession = sessions.find(s => s.bestTime === bestTime);
            const bestConditions = [];
            if (bestSession.weather) bestConditions.push(bestSession.weather);
            if (bestSession.tireType) bestConditions.push(bestSession.tireType);
            if (bestSession.tirePressure) bestConditions.push(`${bestSession.tirePressure} bar`);
            const bestConditionsText = bestConditions.join(' • ') || 'Non renseigné';
            
            const tileDiv = document.createElement('div');
            tileDiv.className = 'circuit-tile';
            tileDiv.innerHTML = `
                <div class="circuit-tile-header">
                    <div class="circuit-tile-name">🏁 ${circuit}</div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.85em; color: #999; margin-bottom: 5px;">Meilleur tour :</div>
                        <div class="circuit-tile-best">${this.formatTime(bestTime)}</div>
                        <div style="font-size: 0.75em; color: #999; margin-top: 5px;">${bestConditionsText}</div>
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
            
            container.appendChild(tileDiv);
            
            setTimeout(() => {
                this.createCircuitChart(circuit, sortedSessions);
            }, 100);
        });
    }

    createCircuitChart(circuit, sessions) {
        const canvasId = `chart-${circuit.replace(/\s+/g, '-')}`;
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        const labels = sessions.map(s => {
            const date = new Date(s.date);
            return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        });
        
        const data = sessions.map(s => s.bestTime);
        
        if (this.circuitCharts[circuit]) {
            this.circuitCharts[circuit].destroy();
        }
        
        this.circuitCharts[circuit] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Temps',
                    data: data,
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
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const session = sessions[context.dataIndex];
                                return [
                                    `Temps: ${this.formatTime(session.bestTime)}`,
                                    session.weather ? `Météo: ${session.weather}` : '',
                                    session.lapsCount ? `Tours: ${session.lapsCount}` : ''
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
                            callback: (value) => this.formatTime(value),
                            color: '#999'
                        },
                        grid: {
                            color: '#2a2a2a'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#999'
                        },
                        grid: {
                            color: '#2a2a2a'
                        }
                    }
                }
            }
        });
    }

    displaySessions() {
        const container = document.getElementById('sessionsList');
        
        if (this.sessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>🏎️ Aucune session enregistrée</p>
                    <p style="font-size: 0.9em;">Ajoutez votre première session !</p>
                </div>
            `;
            return;
        }

        const sortedSessions = [...this.sessions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        container.innerHTML = sortedSessions.map(session => {
            const details = [];
            if (session.lapsCount) details.push(`${session.lapsCount} tours`);
            if (session.weather) details.push(session.weather);
            if (session.temperature) details.push(`${session.temperature}°C`);
            if (session.tireType) details.push(`Pneus: ${session.tireType}`);
            if (session.tirePressure) details.push(`${session.tirePressure} bar`);
            if (session.crownUsed) details.push(`Couronne: ${session.crownUsed}`);
            
            const detailsText = details.length > 0 ? details.join(' • ') : '-';
            
            return `
            <div class="session-item">
                <div class="session-info">
                    <span class="session-date">${this.formatDateShort(session.date)}</span>
                    <span class="session-circuit">📍 ${session.circuit}</span>
                    <span class="session-time">${this.formatTime(session.bestTime)}</span>
                    <span class="session-notes" title="${detailsText}">${detailsText}</span>
                </div>
                <div class="session-actions">
                    <button class="btn-edit" onclick="dashboard.editSession(${session.id})" title="Modifier">
                        ✏️ Modifier
                    </button>
                    <button class="btn-delete" onclick="dashboard.deleteSession(${session.id})" title="Supprimer">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        `;
        }).join('');
    }

    switchView(view) {
        document.querySelectorAll('.view-section').forEach(section => {
            section.style.display = 'none';
        });

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        document.querySelectorAll(`[data-view="${view}"]`).forEach(element => {
            if (element.classList.contains('view-section')) {
                element.style.display = 'block';
            }
            if (element.classList.contains('nav-btn')) {
                element.classList.add('active');
            }
        });
    }

    formatTime(seconds) {
        return seconds.toFixed(3) + 's';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    formatDateShort(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    }

    clearForm() {
        document.getElementById('sessionForm').reset();
        this.setTodayDate();
        this.editingId = null;
        document.querySelector('.btn-primary').textContent = '📊 Enregistrer la session';
        document.getElementById('cancelEditBtn').style.display = 'none';
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new KartingDashboard();
});

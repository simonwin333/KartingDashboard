# 🏁 Karting Dashboard

## 📋 Description du projet

Application web de suivi de performances en karting. Permet d'enregistrer vos sessions, analyser vos temps au tour et suivre votre progression.

**Version actuelle :** 2.1  
**Dernière mise à jour :** 14 février 2026  
**Développeur :** Simon  
**Assistant IA :** Claude (Anthropic)

---

## 📂 Structure du projet

```
C:\Karting\
│
├── index.html          # Structure HTML de l'application
├── style.css           # Styles et thème visuel (noir/blanc/gris)
├── app.js              # Logique JavaScript de l'application
└── README.md           # Ce fichier - Documentation du projet
```

---

## ✨ Fonctionnalités actuelles

### 0. Navigation
- ✅ Menu de navigation avec 4 onglets
- ✅ Ajouter Session / Statistiques / Classement Circuits / Historique

### 1. Gestion des sessions
- ✅ Ajout de sessions de karting
- ✅ Modification de sessions existantes
- ✅ Suppression de sessions (avec confirmation)
- ✅ Annulation de modification
- ✅ Affichage en une seule ligne (compact)

### 2. Gestion des circuits
- ✅ Menu déroulant avec circuits prédéfinis
- ✅ Circuits par défaut : Mariembourg, Genk, Spa
- ✅ Ajout de nouveaux circuits personnalisés
- ✅ Sauvegarde automatique des circuits
- ✅ Tri alphabétique
- ✅ Protection contre les doublons

### 3. Informations par session (ENRICHIES !)
- 📅 Date de la session
- 🏁 Circuit utilisé
- ⏱️ Meilleur temps au tour (en secondes)
- 🔢 **Nombre de tours effectués**
- 🌦️ **Conditions météo** (Sec, Nuageux, Pluie, Pluie forte)
- 🌡️ **Température** (en °C)
- 🛞 **Type de pneus** (Tendres, Médiums, Durs, Pluie)
- ⚙️ **Pression des pneus** (en bar)
- 📝 Notes optionnelles (sensations, réglages châssis, trajectoires)

### 4. Statistiques globales
- 📊 Nombre total de sessions
- 🏆 Meilleur temps absolu
- 📈 Temps moyen sur toutes les sessions
- 🗺️ Nombre de circuits différents visités

### 5. Classement par circuit 🏁 (NOUVEAU !)
- 🥇 Classement des circuits par meilleur temps
- 📊 Statistiques détaillées par circuit :
  - Nombre de sessions sur le circuit
  - Temps moyen
  - Progression (% d'amélioration entre 1ère et dernière session)
- 🏅 Médailles pour les 3 meilleurs circuits

### 6. Graphique d'évolution
- 📉 Graphique linéaire de progression des temps
- 🎨 Thème sombre adapté
- 💡 Tooltip avec détails au survol
- 📊 Axes personnalisés (dates et temps)

### 7. Design
- 🖤 Thème sombre (noir/blanc/gris)
- 📱 Design responsive (optimisé PC, adaptable mobile)
- ✨ Animations et transitions fluides
- 🔔 Notifications de confirmation
- 🎯 Navigation par onglets

---

## 💾 Stockage des données

**Type :** localStorage (navigateur)  
**Localisation :** Stocké localement sur le PC  
**Clés utilisées :**
- `kartingSessions` : Liste des sessions
- `kartingCircuits` : Liste des circuits personnalisés

⚠️ **Important :** Les données sont stockées localement sur chaque ordinateur. Si vous utilisez un autre PC, les données ne seront pas synchronisées.

**Prochainement :** Migration vers une base de données en ligne (Firebase ou similaire) pour synchronisation multi-appareils.

---

## 🎯 Roadmap / Fonctionnalités futures

### 💡 Améliorations suggérées (basées sur analyse concurrentielle)

**Inspirées de LapTrophy, RaceChrono et autres apps professionnelles :**

**1. Analyse de performance avancée**
- [ ] **Secteurs de piste** : Diviser chaque circuit en 3-4 secteurs pour analyser où gagner du temps
- [ ] **Temps optimal théorique** : Calculer le meilleur temps possible en combinant vos meilleurs secteurs
- [ ] **Comparaison de tours** : Comparer 2 tours côte à côte pour voir les différences
- [ ] **Graphique de progression** : Voir l'évolution session par session sur chaque circuit

**2. Données enrichies par session**
- [x] **Conditions météo** : Température, pluie/sec, vent
- [x] **Configuration kart** : Type de pneus (tendres/durs), pression, réglages châssis
- [x] **Nombre de tours** : Combien de tours dans la session
- [ ] **Vitesse de pointe** : Vitesse maximale atteinte
- [ ] **Catégorie** : Entraînement / Course / Qualification

**3. Classements et leaderboards**
- [x] **Meilleurs temps par circuit** : Historique de vos records personnels
- [x] **Classement par période** : Meilleur du mois, de l'année
- [ ] **Consistency score** : Score de régularité (écart-type des temps)

**4. Visualisations améliorées**
- [ ] **Graphique de progression par circuit** : Ligne de tendance pour voir amélioration
- [ ] **Heatmap des performances** : Voir quels jours/conditions vous êtes le meilleur
- [ ] **Graphique radar** : Comparer vos performances sur différents circuits

**5. Export et partage**
- [ ] **Export CSV/Excel** : Pour analyse externe
- [ ] **Export PDF** : Rapport de session formaté
- [ ] **Partage sur réseaux sociaux** : Partager vos records
- [ ] **Import de données** : Importer des sessions depuis fichier

**6. Outils pratiques**
- [ ] **Calculateur de rythme** : "Pour faire un temps de X, je dois faire Y par tour"
- [ ] **Carnet d'entretien kart** : Suivi maintenance (vidange, pneus, etc.)
- [ ] **Notes par circuit** : Mémo des trajectoires, freinage, accélération
- [ ] **Photos de sessions** : Ajouter des photos aux sessions

**7. Analyse comparative**
- [ ] **Comparer avec amis/concurrents** : Si données partagées
- [ ] **Gap analysis** : Voir l'écart avec votre meilleur temps ou un concurrent

### Prévues à court terme
- [ ] Export des données (CSV/Excel)
- [ ] Import de données
- [ ] Filtre par circuit
- [ ] Filtre par période (date)
- [ ] Recherche dans les notes

### Prévues à moyen terme
- [ ] Statistiques par circuit
- [ ] Comparaison entre circuits
- [ ] Graphiques supplémentaires
- [ ] Informations météo par session
- [ ] Type de pneus utilisés
- [ ] Réglages du kart

### Prévues à long terme
- [ ] Base de données en ligne (Firebase)
- [ ] Synchronisation multi-appareils (PC + smartphone)
- [ ] Authentification utilisateur
- [ ] Sauvegarde cloud
- [ ] Application mobile native (optionnel)

---

## 🔧 Guide d'utilisation

### Ajouter une session
1. Sélectionnez la date (aujourd'hui par défaut)
2. Choisissez le circuit dans le menu déroulant
3. Entrez votre meilleur temps en secondes (ex: 45.234)
4. Ajoutez des notes si nécessaire (optionnel)
5. Cliquez sur "📊 Enregistrer la session"

### Ajouter un nouveau circuit
1. Cliquez sur "➕ Ajouter un nouveau circuit"
2. Entrez le nom du circuit (ex: "Francorchamps")
3. Le circuit est automatiquement ajouté et sélectionné
4. Il sera disponible dans le menu pour les prochaines sessions

### Modifier une session
1. Cliquez sur "✏️ Modifier" dans la ligne de la session
2. Les données se chargent dans le formulaire
3. Modifiez les informations souhaitées
4. Cliquez sur "✏️ Modifier la session"

### Supprimer une session
1. Cliquez sur "🗑️ Supprimer" dans la ligne de la session
2. Confirmez la suppression
3. La session est supprimée définitivement

---

## 🛠️ Technologies utilisées

- **HTML5** : Structure de la page
- **CSS3** : Styles et mise en page
- **JavaScript (ES6+)** : Logique de l'application
- **Chart.js** : Bibliothèque pour les graphiques
- **localStorage API** : Stockage des données

---

## 📝 Notes de développement

### Conventions de code
- Classes JavaScript en PascalCase (ex: `KartingDashboard`)
- Fonctions et variables en camelCase (ex: `addSession`)
- Constantes en UPPER_CASE si nécessaire
- Commentaires en français

### Structure du code JavaScript
```javascript
class KartingDashboard {
    constructor()           // Initialisation
    init()                  // Configuration initiale
    setupEventListeners()   // Gestion des événements
    
    // Gestion des sessions
    addSession()
    editSession()
    deleteSession()
    
    // Gestion des circuits
    loadCircuits()
    saveCircuits()
    populateCircuits()
    addNewCircuit()
    
    // Affichage
    updateDashboard()
    updateStats()
    updateChart()
    displaySessions()
    
    // Utilitaires
    formatTime()
    formatDate()
    formatDateShort()
    showNotification()
}
```

---

## 🔄 Historique des versions

### Version 2.1 (14/02/2026) - REFONTE MAJEURE 🎉
- 🏠 **Dashboard Homepage** : Page d'accueil avec résumé et dernières sessions
- 👤 **Page Profil** : Nom pilote, type de kart, moteur, catégorie, numéro
- ⚙️ **Page Réglages** : Gestion des données (effacement)
- ➕ **Bouton flottant** : Ajout rapide de session depuis n'importe où
- 🎯 **Modale** : Formulaire d'ajout/modification en pop-up
- 📊 **Analyse par circuit améliorée** : Tuiles avec graphiques individuels
- 🐛 **Bug corrigé** : Pression pneus précision à 0.01 bar
- 🎨 Menu de navigation remanié (Dashboard/Circuits/Historique/Profil/Réglages)

### Version 2.0 (14/02/2026) - MISE À JOUR MAJEURE 🚀
- ✨ **Navigation par onglets** : Menu avec 4 sections (Ajouter/Stats/Circuits/Historique)
- ✨ **Données enrichies** : Météo, température, type de pneus, pression pneus
- ✨ **Nombre de tours** : Ajout du nombre de tours par session
- ✨ **Classement par circuit** : Vue dédiée avec statistiques détaillées
  - Meilleur temps par circuit
  - Temps moyen par circuit
  - Progression (% amélioration)
  - Médailles pour les 3 meilleurs
- 🎨 Amélioration de l'interface utilisateur
- 📊 Affichage des nouvelles données dans l'historique

### Version 1.3 (14/02/2026)
- ✨ Ajout du bouton "Annuler" en mode édition
- 🐛 Correction : Impossible de revenir en arrière lors d'une modification
- 📝 Documentation des améliorations suggérées

### Version 1.2 (14/02/2026)
- ✨ Ajout du menu déroulant pour les circuits
- ✨ Possibilité d'ajouter de nouveaux circuits
- ✨ Circuits par défaut : Mariembourg, Genk, Spa
- 🐛 Correction de l'affichage des sessions

### Version 1.1 (14/02/2026)
- ✨ Affichage des sessions en une seule ligne
- ✨ Ajout du bouton "Modifier"
- ✨ Amélioration de l'interface des boutons d'action
- 🎨 Optimisation du responsive mobile

### Version 1.0 (14/02/2026)
- 🎉 Version initiale
- ✨ Ajout/suppression de sessions
- ✨ Statistiques de base
- ✨ Graphique d'évolution
- 🎨 Thème sombre noir/blanc/gris

---

## 🐛 Problèmes connus

Aucun problème connu pour le moment.

---

## 📞 Support

Pour toute question ou suggestion d'amélioration, continuer la conversation avec Claude.

---

## 📄 Licence

Projet personnel - Usage privé

---

**Bon karting et bonne progression ! 🏎️💨**

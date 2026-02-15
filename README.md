# 🏁 Karting Dashboard v3.2

Application web professionnelle de suivi de performances en karting avec synchronisation cloud Firebase.

**🔥 100% Cloud** • **🔐 Connexion obligatoire** • **📱 Multi-appareils**

---

## ✨ Fonctionnalités

### 🔐 Authentification
- Connexion Google (OAuth 2.0)
- E-mail + Mot de passe sécurisé
- Profil obligatoire au premier lancement
- Déconnexion sécurisée

### 📊 Gestion des Sessions
- Enregistrement complet (date, heure, circuit, temps, tours)
- Conditions météo et piste (météo, température)
- Setup technique (pneus, pression, couronne, tours moteur)
- Notes personnalisées
- Modification et suppression synchronisée
- Historique chronologique (tri par date + heure)

### 🏁 Analyse par Circuit
- Meilleur temps personnel avec format intelligent (52.520s ou 1:05.412m)
- Conditions du record détaillées
- Graphiques d'évolution Chart.js
- Statistiques complètes (moyenne, total)
- Filtrage par circuit

### ⚙️ Réglages Unifiés
- **Profil pilote** : Nom, kart, moteur
- **Apparence** : Mode clair/sombre (auto-apply)
- **Compte** : Déconnexion
- **Données** : Suppression sécurisée avec protection
- **Soutien** : Bouton donation

---

## 🛠️ Technologies

- **Frontend** : HTML5, CSS3, JavaScript ES6+
- **Auth** : Firebase Authentication (Google + E-mail)
- **Database** : Cloud Firestore (NoSQL)
- **Charts** : Chart.js
- **Hosting** : GitHub Pages

**Stats** : ~2500 lignes, ~80 KB

---

## 🚀 Installation

### 1. Créer Projet Firebase

1. https://console.firebase.google.com
2. Nouveau projet : **karting**
3. Activer **Authentication** :
   - Google
   - E-mail/Password
4. Activer **Firestore Database** (Mode Production)

### 2. Règles Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. Configuration API

Dans `app.js` lignes 10-16, remplacez par votre config Firebase.

### 4. GitHub Pages

1. Créez repo GitHub
2. Uploadez : `index.html`, `style.css`, `app.js`
3. Settings → Pages → Source: `main`
4. URL : `https://votre-nom.github.io/karting/`

### 5. Domaine Autorisé

Firebase → Authentication → Settings → Authorized domains
- Ajoutez : `votre-nom.github.io`

---

## 🔒 Sécurité

### Multi-Couches
- ✅ **Authentication** obligatoire
- ✅ **Firestore Rules** : Isolation totale
- ✅ **Authorized Domains** : Limite accès
- ✅ **Rate Limiting** : Anti-spam Firebase

### API Key Publique
**C'EST NORMAL** ✅

Firebase est conçu ainsi. La sécurité repose sur :
- Rules Firestore (qui peut lire/écrire)
- Authorized Domains (d'où vient la requête)
- Authentication (qui est connecté)

### Protection Anti-Erreur
- Double confirmation suppression
- Compteur de sessions affiché
- Confirmation par nom de pilote
- Messages d'avertissement clairs

---

## 📱 Utilisation

### Première Connexion
1. Ouvrez l'app → Popup connexion
2. Connectez-vous (Google recommandé)
3. Remplissez profil → Navigation débloquée
4. Ajoutez vos sessions

### Multi-Appareils
**PC** : Ajoutez 50 sessions
**Smartphone** : Connexion → 50 sessions visibles ✅
**Sync temps réel** sur tous appareils

### Ajout Session
- Format temps intelligent : 
  - `52.520s` (< 1 minute)
  - `1:05.412m` (≥ 1 minute)
- Heure pré-remplie (actuelle)
- Tous champs sauvegardés Firebase

---

## 🐛 Dépannage

### "Unauthorized domain"
→ Ajoutez votre domaine dans Firebase Auth

### Profil bloqué
→ Remplissez TOUS les champs (nom, kart, moteur)

### Sessions non visibles
→ Vérifiez règles Firestore

### Heure incorrecte
→ Ouvrez formulaire → Heure actuelle auto

---

## 🔮 Améliorations Futures

### Court Terme
- [ ] Export CSV/PDF
- [ ] PWA complet (offline)
- [ ] Validation formulaires avancée
- [ ] Statistiques de progression

### Moyen Terme
- [ ] Notifications push
- [ ] Comparaison entre pilotes
- [ ] Objectifs personnalisés
- [ ] Mode coaching

### Long Terme
- [ ] App mobile native
- [ ] Intégration GPS/Chrono
- [ ] Réseau social karting
- [ ] Analyse IA performances

---

## 📊 Performance

- **First Load** : ~2s (Firebase init)
- **Navigation** : Instantanée
- **Sync Firebase** : ~500ms
- **Gratuit jusqu'à** : 50K lectures/jour (largement suffisant)

---

## 🤝 Contribution

Pull requests bienvenues !

1. Fork
2. Branch (`git checkout -b feature/amelioration`)
3. Commit (`git commit -m 'Add feature'`)
4. Push (`git push origin feature/amelioration`)
5. Pull Request

---

## 📄 Licence

MIT License - Utilisation libre

---

## 👨‍💻 Auteur

**Simon** avec **Claude AI** (Anthropic)

---

## ❤️ Soutien

Si l'app vous est utile, offrez un café au créateur !

**PayPal** : (lien à configurer dans Réglages)

---

## 🎯 Changelog

### v3.2 (16/02/2026)
- ✅ Profil pré-rempli dans Réglages
- ✅ Boutons Réglages unifiés (largeur)
- ✅ Suppression sécurisée (compteur + confirmation nom)
- ✅ Bouton donation ajouté
- ✅ Textes améliorés

### v3.1 (15/02/2026)
- ✅ Connexion obligatoire
- ✅ 100% Cloud Firebase
- ✅ Profil fusionné dans Réglages
- ✅ Format temps intelligent (s/m)
- ✅ Heure temps réel

### v3.0 (14/02/2026)
- ✅ Intégration Firebase complète
- ✅ Auth Google + E-mail
- ✅ Sync multi-appareils

---

**🏁 Bonne course ! 🏁**

# 🏁 Karting Dashboard v3.1

Application web professionnelle de suivi de performances en karting avec synchronisation cloud Firebase.

**🔥 100% Cloud** - Connexion obligatoire - Multi-appareils

---

## ✨ Fonctionnalités

### 🔐 Authentification
- Connexion Google ou E-mail/Password
- Profil obligatoire au premier lancement
- Déconnexion sécurisée

### 📊 Sessions
- Enregistrement complet (date, heure, circuit, temps, tours, conditions météo, pneus, couronne)
- Modification/Suppression synchronisée
- Historique chronologique

### 🏁 Circuits
- Meilleur temps personnel
- Conditions du record détaillées
- Graphiques d'évolution
- Filtrage par circuit

### ⚙️ Réglages
- Profil pilote
- Mode clair/sombre
- Gestion des données
- Déconnexion

---

## 🛠️ Technologies

- HTML5, CSS3, JavaScript ES6+
- Firebase (Auth + Firestore)
- Chart.js
- GitHub Pages

**Stats** : ~2400 lignes de code, ~75 KB

---

## 🚀 Installation

### 1. Firebase
1. Projet Firebase : https://console.firebase.google.com
2. Activez Authentication (Google + E-mail)
3. Activez Firestore
4. Règles Firestore :
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

### 2. GitHub Pages
1. Créez un repo
2. Uploadez les 3 fichiers
3. Settings → Pages → Activez
4. Récupérez l'URL

### 3. Autoriser le Domaine
Firebase → Authentication → Settings → Authorized domains
- Ajoutez : `votre-nom.github.io`

---

## 🔒 Sécurité

✅ **API Key publique** : Normal et sécurisé
✅ **Firestore Rules** : Isolation totale des données
✅ **Auth obligatoire** : Pas d'accès anonyme
✅ **Rate limiting** : Protection automatique Firebase

**Protection contre :**
- Brute force
- Spam
- Injection
- XSS

---

## 📱 Utilisation

### Multi-Appareils
1. PC : Connexion → Ajout sessions
2. Smartphone : Même compte → Données synchronisées ✅
3. Temps réel sur tous les appareils

---

## 🐛 Bugs Connus

Aucun bug critique connu.

**Si problème :**
1. Vérifiez les règles Firestore
2. Vérifiez le domaine autorisé
3. Videz le cache (Ctrl+F5)

---

## 🔮 Améliorations Futures

- Export CSV
- Mode hors ligne (PWA)
- Comparaison avec autres pilotes
- Coaching IA
- App mobile native
- Intégration GPS/Chrono

---

## 📈 Performance

- First Load : ~2s
- Sync : ~500ms
- Gratuit : 50K lectures/jour
- Responsive : PC + Tablet + Mobile

---

## 📄 Licence

MIT License

---

## 👨‍💻 Auteur

Simon avec Claude AI (Anthropic)

---

## 🎯 Changelog

### v3.1 (15/02/2026)
- ✅ Connexion obligatoire
- ✅ 100% Cloud
- ✅ Profil dans Réglages
- ✅ Déconnexion
- ✅ Format temps amélioré
- ✅ Suppression cloud
- ✅ Conditions enrichies

---

**🏁 Bonne course ! 🏁**

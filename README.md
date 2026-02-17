# 🏁 Karting Dashboard v4.0

Application web mobile pour suivre vos performances en karting.

## 🌐 Application en ligne
https://simonwin333.github.io/KartingDashboard/

## ✨ Fonctionnalités
- ✅ Connexion sécurisée (Google ou Email)
- ✅ Profil pilote obligatoire au premier lancement
- ✅ Ajout de sessions avec tous les détails
- ✅ Analyse par circuit avec graphiques
- ✅ Détection automatique des records
- ✅ Synchronisation cloud Firebase
- ✅ Installation sur smartphone (PWA)
- ✅ FAQ intégrée
- ✅ Support donations

## 📁 Fichiers
```
index.html       → Structure HTML
style.css        → Styles et thèmes
app.js           → Logique application
manifest.json    → Configuration PWA
service-worker.js → Cache hors-ligne
icon-192.png     → Icône 192x192
icon-512.png     → Icône 512x512
```

## 🚀 Installation GitHub Pages

1. Uploadez tous les fichiers sur GitHub
2. Settings → Pages → Branch: main
3. Firebase Console → Authentication → Authorized domains
4. Ajoutez : `votre-username.github.io`

## 📱 PWA - Installation smartphone

### Android (Chrome)
1. Ouvrez l'app dans Chrome
2. Réglages → "📲 Installer sur l'écran d'accueil"
3. OU menu Chrome → "Ajouter à l'écran d'accueil"

### iOS (Safari)
1. Ouvrez l'app dans Safari
2. Bouton Partager (📤)
3. "Sur l'écran d'accueil"
4. Confirmez

## 🔒 Sécurité Firebase
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

## 🆕 Nouveautés v4.0
- Profil obligatoire avec CGU au premier lancement
- PWA complet (installation smartphone)
- FAQ intégrée (10 Q&R)
- Donation via Buy Me a Coffee
- Dashboard limité aux 10 dernières sessions
- Bouton café discret dans le header

## ❤️ Soutenir
https://buymeacoffee.com/kartdashboard

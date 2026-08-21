# 🏆 E-sport Tournament Platform API

API REST pour une plateforme de gestion de tournois, développée avec Node.js, Express et MongoDB. Le projet couvre la gestion des utilisateurs, des rôles, des tournois et des inscriptions, avec une attention particulière portée à la sécurité des endpoints.

## ✨ Fonctionnalités

- Gestion des utilisateurs (inscription, connexion, authentification JWT)
- Gestion des rôles et des permissions (autorisation par middleware)
- Création, consultation, modification et suppression de tournois
- Gestion des inscriptions aux tournois
- Validation stricte des données entrantes
- Protection contre le mass assignment sur les endpoints PUT/PATCH
- Couverture de tests d'intégration sur 18 user stories

## 🛠 Technologies utilisées

- **Node.js** — environnement d'exécution
- **Express** — framework backend
- **MongoDB** / **Mongoose** — base de données et ODM
- **JWT** — authentification
- **Node.js Test Runner** (`node:test`) — tests d'intégration

## ✅ Prérequis

- Node.js (v18 ou supérieur recommandé)
- npm
- MongoDB (instance locale ou distante, ex. MongoDB Atlas)

## 📦 Installation

```bash
git clone https://github.com/Arkanona/GestionStructureE-sport.git
cd GestionStructureE-sport
npm install
```

## ⚙️ Configuration

Créer un fichier `.env` à la racine du projet :

```env
MONGODB_URI=mongodb://...
JWT_SECRET=ton_secret_jwt
```

## 🚀 Lancement

```bash
# Démarrage en développement (avec nodemon si configuré)
npm run dev

# Démarrage en production
npm start
```

Le serveur est accessible par défaut sur `http://localhost:3000`.

## 📁 Structure du projet

```
├── config/             
├── controllers/       # Logique métier des routes
├── models/             # Schémas Mongoose
├── routes/              # Définition des endpoints
├── middlewares/     # Auth, validation, autorisation
├── tests/                 # Tests d'intégration (node:test)
├── .env
├── app.js
└── package.json
```

## 🔌 Endpoints principaux

### 🔑 Auth (`/api/v1/auth`)

| Méthode | Endpoint                    | Description                              | Auth requise |
|---------|-------------------------------|--------------------------------------------|:---:|
| POST    | `/register`                  | Inscription utilisateur                    | ❌ |
| POST    | `/login`                      | Connexion et génération du token JWT       | ❌ |
| PATCH   | `/update-profile/:id`         | Mise à jour du profil utilisateur          | ✅ |
| PATCH   | `/update-role/:id`            | Mise à jour du rôle d'un utilisateur       | ✅ |

### 👥 Team (`/api/v1/team`)

| Méthode | Endpoint                              | Description                                  | Auth requise |
|---------|------------------------------------------|------------------------------------------------|:---:|
| POST    | `/new`                                   | Création d'une équipe                          | ✅ |
| PATCH   | `/join/:idTeam`                          | Rejoindre une équipe                           | ✅ |
| PATCH   | `/invite/:idTeam`                        | Inviter un coéquipier                          | ✅ |
| PATCH   | `/remove/:idTeam`                        | Retirer un coéquipier                          | ✅ |
| PATCH   | `/add-team/:idTeam/:idTournament`        | Inscrire l'équipe à un tournoi                 | ✅ |
| DELETE  | `/delete/:idTeam`                        | Suppression d'une équipe                       | ✅ |
| GET     | `/:idTeam`                               | Détail d'une équipe                            | ✅ |

### 🏆 Tournament (`/api/v1/tournament`)

| Méthode | Endpoint                              | Description                                  | Auth requise |
|---------|------------------------------------------|------------------------------------------------|:---:|
| POST    | `/new`                                   | Création d'un tournoi                          | ✅ |
| PATCH   | `/update-tournament/:id`                 | Mise à jour d'un tournoi                       | ✅ |
| DELETE  | `/delete/:id`                            | Suppression d'un tournoi                       | ✅ |
| GET     | `/`                                      | Liste des tournois ouverts                     | ✅ |
| GET     | `/:idTournament`                         | Détail des équipes inscrites à un tournoi      | ✅ |
| GET     | `/team-registered/:idTournament`         | Nombre d'équipes inscrites                     | ✅ |
| GET     | `/check/:idTeam`                         | Vérification du statut d'inscription           | ✅ |

> ℹ️ Tous les endpoints protégés passent par `authMiddleware` (vérification du token JWT).

# 🔒 Sécurité

- **JWT** pour l'authentification des utilisateurs
- **Middlewares d'autorisation** pour restreindre l'accès selon le rôle
- **Helmet** pour sécuriser les en-têtes HTTP (CSP désactivée, `crossOriginResourcePolicy` en `cross-origin`)
- **CORS** configuré pour n'autoriser que les origines de confiance
- **Rate limiting** (`express-rate-limit`) : 100 requêtes / 15 minutes par client
- **Validation des entrées** sur tous les endpoints sensibles (POST/PATCH)
- **Protection contre le mass assignment** : seuls les champs autorisés sont pris en compte lors des mises à jour, empêchant un utilisateur de modifier des champs sensibles (ex. `role`, `isAdmin`) via le body de la requête

## 🧪 Tests

Les tests d'intégration couvrent 18 user stories et utilisent le test runner natif de Node.js.

```bash
npm run test
```

## 👤 Auteur

**Enzo** — [@Arkanona](https://github.com/Arkanona)

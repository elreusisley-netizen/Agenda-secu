# AGENDA SECU — Étape 2 : reproduction des maquettes

Application de gestion des plannings mensuels des agents de sécurité.
Cette version contient **uniquement l'interface**, avec des **données de démonstration fictives**
(dossier `src/demo`). Aucune base de données n'est encore branchée : un rechargement de page remet tout à zéro.

## 1. Installer Node.js (une seule fois)

1. Va sur https://nodejs.org et télécharge la version **LTS**.
2. Installe-la en gardant les options par défaut.
3. Vérifie : ouvre un **Terminal** (Mac) ou **PowerShell** (Windows) et tape `node -v`. Un numéro doit s'afficher.

## 2. Lancer l'application sur ton ordinateur

1. Dézippe `agenda-secu.zip` (par exemple dans `Documents`).
2. Dans le Terminal, place-toi dans le dossier :
   `cd Documents/agenda-secu`
3. Installe les outils du projet (une seule fois, 1 à 2 minutes) :
   `npm install`
4. Lance l'application :
   `npm run dev`
5. Ouvre l'adresse affichée (en général http://localhost:5173) dans ton navigateur.

Pour arrêter : `Ctrl + C` dans le Terminal.

## 3. Tester sur ton téléphone

Ton téléphone doit être sur **le même Wi-Fi** que l'ordinateur.

1. Lance `npm run dev:telephone` au lieu de `npm run dev`.
2. Le Terminal affiche une ligne `Network: http://192.168.x.x:5173`.
3. Tape cette adresse dans le navigateur du téléphone.

## 4. Les écrans à vérifier

| Écran | Adresse |
| --- | --- |
| Connexion | `/#/connexion` |
| Accueil agent | `/#/agent` |
| Mes disponibilités | `/#/agent/disponibilites` |
| Missions disponibles | `/#/agent/missions` |
| Mon planning | `/#/agent/planning` |
| Tableau de bord admin | `/#/admin` |
| Planning des missions | `/#/admin/plannings` |

La pastille **DÉMO** en bas à droite permet de passer d'un espace à l'autre et de remettre la démo à zéro.
Sur l'écran de connexion : champs vides → espace agent ; « admin » dans l'e-mail → espace administrateur.

## 5. Organisation du code

- `src/index.css` : couleurs et police de la charte (bleu nuit, jaune, codes des disponibilités)
- `src/pages/agent` : écrans mobiles de l'agent
- `src/pages/admin` : écrans web de l'administration
- `src/components` : éléments réutilisés (logo, barre du bas, menu latéral…)
- `src/lib` : routeur et outils de dates
- `src/demo` : **données fictives**, supprimées à l'étape 3

Commandes utiles : `npm run build` (version finale dans `dist/`), `npm run verifier` (contrôle TypeScript).

## 6. Étape 4 — connexion réelle

L'application se connecte au projet Supabase de test (valeurs publiques dans `.env.development` et `.env.production`).
Sans ces fichiers, elle repasse automatiquement en mode démo.

Réglages à faire une fois dans Supabase :

1. **Authentication > Sign In / Providers > Email** : désactiver « Allow new users to sign up » (seul l'administrateur crée les comptes).
2. **Authentication > URL Configuration** :
   - Site URL : l'adresse Cloudflare de l'application (ex. `https://agenda-secu.pages.dev`)
   - Redirect URLs : ajouter `https://agenda-secu.pages.dev/**` et `http://localhost:5173/**`
3. **Authentication > Emails** : coller les modèles français de `supabase/modeles_emails.md`.

Mise en ligne sur Cloudflare Pages (Workers & Pages > Create > Pages > Connect to Git) :
- dépôt GitHub `agenda-secu`, branche `main`
- Framework preset : `Vite` — Build command : `npm run build` — Build output directory : `dist`
- Variable d'environnement : `NODE_VERSION` = `22`

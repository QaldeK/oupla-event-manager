# Oupla Event Manager

> **Statut :** en développement actif — non produit

Application de gestion d'événements pour espaces associatifs. Permet de créer des événements, gérer des sondages de dates, coordonner des organisateurs, et publier un site public avec thème personnalisable.

## Prérequis

- [Bun](https://bun.sh) >= 1.0
- PocketBase binaire v0.38.1 (téléchargé automatiquement via le script ci-dessous)

## Installation

```bash
# 1. Cloner le dépôt
git clone <url-du-depot>
cd oupla-event-manager/event-manager

# 2. Installer les dépendances
bun install

# 3. Télécharger PocketBase v0.38.1 (linux amd64 par défaut)
#    Adapte l'architecture si nécessaire (darwin/arm64, etc.)
curl -fsSL https://github.com/pocketbase/pocketbase/releases/download/v0.38.1/pocketbase_0.38.1_linux_amd64.zip -o /tmp/pb.zip \
  && unzip -o /tmp/pb.zip -d pb/ \
  && chmod +x pb/pocketbase \
  && rm /tmp/pb.zip

# 4. Lancer PocketBase (les migrations s'appliquent automatiquement)
./pb/pocketbase serve

# 5. Dans un autre terminal, lancer le dev server
bun run dev
```

L'app est accessible sur `http://localhost:5173`.

## Architecture

```
event-manager/
├── src/
│   ├── lib/
│   │   ├── shared/          # Stores réactifs (Svelte 5 runes)
│   │   ├── services/        # Logique métier
│   │   ├── components/      # Composants Svelte
│   │   ├── types/           # Types TypeScript
│   │   └── validation/      # Validateurs
│   └── routes/              # Pages SvelteKit (CSR-only)
├── pb/
│   ├── pocketbase           # Binaire PocketBase (gitignoré)
│   ├── pb_hooks/            # Hooks JSVM côté serveur
│   └── pb_migrations/       # Migrations de schéma
└── package.json
```

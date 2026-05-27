# Tests de l'Application Oupla Event Manager

Ce dossier contient tous les tests unitaires et d'intégration pour l'application de gestion d'événements Oupla.

## 🚀 Commandes de base

```bash
# Exécuter tous les tests
bun run test

# Exécuter les tests avec surveillance des changements
bun run test --watch

# Exécuter un fichier de test spécifique
bun run test nom-du-fichier.test.ts

# Exécuter un test spécifique par nom
bun run test:unit -- -t "nom du test"

# Vérifier le type checking
bun run check

# Linter + formatter avant les tests
bun run lint && bun run format
```

## 📁 Structure des tests

### Tests unitaires (avec mocks)

- **`conflict-deduplication.test.ts`** - Tests de déduplication des conflits d'événements
- **`eventActions-conflicts.test.ts`** - Tests de gestion des conflits après sauvegarde
- **`recurrent-conflicts.test.ts`** - Tests des conflits pour événements récurrents (moqués)
- **`eventmodal-integration.test.ts`** - Tests d'intégration du modal d'événement
- **`validation-integration.test.ts`** - Tests d'intégration de la validation
- **`utils.test.ts`** - Tests des utilitaires et de la logique métier

### Tests d'intégration (vraie base de données)

- **`integration.test.ts`** - Tests d'intégration PocketBase généraux
- **`integration-with-validation.test.ts`** - Tests d'intégration avec validation préalable
- **`real-recurrent.test.ts`** - Tests réels pour événements récurrents

### Utilitaires

- **`test-utils.ts`** - Fonctions utilitaires pour créer des données de test cohérentes

## ⚠️ Tests avec vraie base de données

**ATTENTION** : Certains tests créent de vrais événements dans PocketBase !

### Authentification requise

Les tests d'intégration nécessitent une authentification :

- Configurer les variables dans `.env` (voir `.env.example`)

### Tests concernés

- `integration.test.ts`
- `integration-with-validation.test.ts`
- `real-recurrent.test.ts`

Ces tests sont marqués avec l'avertissement ⚠️ dans leurs en-têtes.

## 🧪 Types de tests

### 1. Tests de logique métier

```bash
# Déduplication des conflits
bun run test conflict-deduplication.test.ts

# Utilitaires et validation
bun run test utils.test.ts
```

### 2. Tests d'intégration avec mocks

```bash
# Gestion des conflits (moqué)
bun run test eventActions-conflicts.test.ts
bun run test recurrent-conflicts.test.ts

# Validation (moqué)
bun run test validation-integration.test.ts
```

### 3. Tests d'intégration réels

```bash
# Création d'événements réels
bun run test integration.test.ts

# Validation + création réelle
bun run test integration-with-validation.test.ts

# Événements récurrents réels
bun run test real-recurrent.test.ts
```

## 🛠️ Configuration des tests

### Fonctions testées principales

#### eventActions.ts

- `deduplicateConflictIds()` - Déduplication des IDs de conflit
- `cleanupBidirectionalConflicts()` - Nettoyage des conflits bidirectionnels
- `validateAndCleanExistingConflicts()` - Validation et nettoyage des conflits existants
- `updateEventConflicts()` - Mise à jour des conflits d'événement
- `handleEventConflictsAfterSave()` - Gestion des conflits après sauvegarde
- `getNewEvent()` - Création d'un nouvel événement vide
- `getDefaultRecurrence()` - Configuration par défaut de récurrence

#### pocketbase.svelte.ts

- `createEvent()` - Création d'événement
- `updateEvent()` - Mise à jour d'événement
- `createRecurrentEvent()` - Création d'événements récurrents
- `updateReciprocalConflicts()` - Mise à jour des conflits réciproques

#### validation/event-validator.svelte.ts

- `validateEventStatic()` - Validation statique d'événement
- Profils de validation : `DRAFT`, `STANDARD_EVENT`, `RECURRENT_MASTER`

### Configuration Mofo (test-utils.ts)

Les tests utilisent la vraie configuration de l'espace Mofo :

#### Salles disponibles

- `bibli`, `salle-2`, `salle 3`

#### Catégories

- `autre`, `apéro`, `concert`, `discussion`, `atelier`, `réunion`, `spectacle`, `jeu`

#### Tâches

- `présence`, `com`, `ménage`, `contact`, `course`, `animation`, `ouverture`, `newtask`

#### Membres de test

- `aldek` (admin), `ghald` (helpers), `pito` (helpers), `zeo` (helpers), etc.

## 🎯 Exemples d'utilisation

### Exécuter un test spécifique

```bash
# Test de déduplication des conflits
bun run test:unit -- -t "deduplicateConflictIds"

# Test de création d'atelier
bun run test:unit -- -t "should create a valid atelier event"

# Test d'événement récurrent
bun run test:unit -- -t "should create recurrent events and return event IDs"
```

### Créer de nouvelles données de test

```typescript
import { createCompleteEvent, createMofoOrganizer, createMofoTask } from "./test-utils";

// Événement complet et valide
const event = createCompleteEvent(
	"Mon Atelier",
	"atelier",
	"2025-08-15",
	"14:00",
	"17:00",
	true, // isPublic
	true // isConfirmed
);

// Ajouter des organisateurs
event.organizers = [
	createMofoOrganizer("aldek", ["présence", "animation"]),
	createMofoOrganizer("ghald", ["com"])
];

// Ajouter des tâches
event.tasks = [createMofoTask("présence"), createMofoTask("animation"), createMofoTask("com")];
```

## 🔧 Dépannage

### Erreurs communes

1. **Tests d'intégration qui échouent**
   - Vérifier l'authentification PocketBase
   - S'assurer que la base de données de test est accessible

2. **Erreurs de validation**
   - Vérifier que les données de test respectent les contraintes
   - Utiliser `validateEventStatic()` pour déboguer

3. **Mocks qui ne fonctionnent pas**
   - Vérifier que les imports sont correctement mockés
   - Utiliser `vi.clearAllMocks()` dans `beforeEach()`

### Debugger les tests

```bash
# Voir les logs détaillés
bun run test --reporter=verbose

# Exécuter en mode debug
bun run test --inspect-brk
```

## 📊 Couverture des tests

Les tests couvrent :

- ✅ Gestion des conflits d'événements
- ✅ Validation des données d'événements
- ✅ Création et modification d'événements
- ✅ Événements récurrents
- ✅ Intégration PocketBase
- ✅ Utilitaires de manipulation des dates

## 🚨 Bonnes pratiques

1. **Toujours nettoyer après les tests d'intégration**
2. **Utiliser des données de test cohérentes** (via test-utils.ts)
3. **Mocker les dépendances externes** dans les tests unitaires
4. **Tester les cas d'erreur** autant que les cas de succès
5. **Garder les tests rapides** en utilisant des mocks quand possible

## 📝 Contribuer

Pour ajouter de nouveaux tests :

1. Utiliser les utilitaires dans `test-utils.ts`
2. Respecter la convention de nommage des fichiers (`*.test.ts`)
3. Ajouter les commandes d'exécution en en-tête
4. Documenter les tests d'intégration qui utilisent la vraie base de données

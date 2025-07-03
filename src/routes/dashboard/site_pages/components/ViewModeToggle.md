# ViewModeToggle Component

Composant de basculement entre les modes d'affichage "cartes" et "liste" avec option de persistance automatique.

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `currentMode` | `"cards" \| "list"` | `"cards"` | Mode d'affichage actuel (ignoré si autoSave est activé) |
| `onModeChange` | `(mode: "cards" \| "list") => void` | `undefined` | Fonction appelée lors du changement de mode |
| `storageKey` | `string` | `"view-mode"` | Clé de stockage localStorage (utilisée avec autoSave) |
| `autoSave` | `boolean` | `false` | Active la persistance automatique du mode |

## Modes d'utilisation

### Mode contrôlé (par défaut)
Le composant reçoit le mode actuel via props et notifie les changements via `onModeChange`.

### Mode autonome avec auto-sauvegarde
Quand `autoSave` est activé, le composant gère automatiquement la persistance du mode d'affichage.

## Utilisation

### Mode contrôlé basique

```svelte
<script>
import { ViewModeToggle } from './components/index.js';

let currentMode = 'cards';

function handleModeChange(mode) {
  currentMode = mode;
  // Autres actions...
}
</script>

<ViewModeToggle {currentMode} onModeChange={handleModeChange} />
```

### Mode contrôlé avec persistance manuelle

```svelte
<script>
import { ViewModeToggle } from './components/index.js';
import { persistedState } from '$lib/utils/local-state.svelte.js';

const viewModeStore = persistedState('my-view-mode', 'cards');
let currentMode = $derived(viewModeStore.value);

function handleModeChange(mode) {
  viewModeStore.value = mode;
}
</script>

<ViewModeToggle {currentMode} onModeChange={handleModeChange} />
```

### Mode autonome avec auto-sauvegarde

```svelte
<script>
import { ViewModeToggle } from './components/index.js';

// Le composant gère tout automatiquement
function handleModeChange(mode) {
  console.log('Mode changé vers:', mode);
  // Actions optionnelles...
}
</script>

<ViewModeToggle
  autoSave={true}
  storageKey="pages-view-mode"
  onModeChange={handleModeChange}
/>
```

### Mode autonome simple

```svelte
<script>
import { ViewModeToggle } from './components/index.js';
</script>

<!-- Persistance automatique sans callback -->
<ViewModeToggle autoSave={true} />
```

## Comportement

### Persistance
- Quand `autoSave` est activé, le mode est automatiquement sauvegardé dans le localStorage
- La clé de stockage peut être personnalisée via `storageKey`
- Le mode est restauré automatiquement au chargement de la page

### Classes CSS
- Utilise les classes DaisyUI : `btn`, `join`, `join-item`, `btn-sm`, `btn-active`
- Compatible avec les thèmes DaisyUI

### Accessibilité
- Attributs `title` pour les tooltips
- Structure de boutons appropriée pour les lecteurs d'écran
- États visuels clairs (actif/inactif)

## Exemples complets

### Avec PagesList

```svelte
<script>
import { PagesList, ViewModeToggle } from './components/index.js';

let pages = [...]; // Vos données
</script>

<div class="flex justify-between items-center mb-4">
  <h2>Mes pages</h2>
  <ViewModeToggle
    autoSave={true}
    storageKey="pages-view-mode"
    onModeChange={(mode) => {
      // Actions optionnelles lors du changement
    }}
  />
</div>

<PagesList
  {pages}
  displayMode={/* récupéré automatiquement */}
/>
```

### Intégration dans un header

```svelte
<script>
import { ViewModeToggle } from './components/index.js';
</script>

<header class="flex justify-between items-center p-4">
  <h1>Titre de la page</h1>
  <div class="flex gap-4">
    <ViewModeToggle autoSave={true} storageKey="header-view-mode" />
    <button class="btn btn-primary">Action</button>
  </div>
</header>
```

## API

### Événements
- Le composant émet le changement de mode via `onModeChange`
- Aucun événement DOM personnalisé

### Méthodes
Aucune méthode publique exposée.

### État interne
- Gère automatiquement la synchronisation avec le localStorage quand `autoSave` est activé
- Réagit aux changements de props quand en mode contrôlé

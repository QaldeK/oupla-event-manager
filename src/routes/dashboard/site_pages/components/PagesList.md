# PagesList Component

Composant réutilisable pour afficher une liste de pages avec deux modes d'affichage : cartes ou liste.

## Props

| Prop                    | Type                   | Défaut                                       | Description                             |
| ----------------------- | ---------------------- | -------------------------------------------- | --------------------------------------- |
| `pages`                 | `SitePagesResponse[]`  | `[]`                                         | Liste des pages à afficher              |
| `isLoading`             | `boolean`              | `false`                                      | État de chargement                      |
| `displayMode`           | `"cards" \| "list"`    | `"cards"`                                    | Mode d'affichage                        |
| `onDelete`              | `(id: string) => void` | `undefined`                                  | Fonction appelée lors de la suppression |
| `editBaseUrl`           | `string`               | `""`                                         | URL de base pour l'édition              |
| `viewBaseUrl`           | `string`               | `""`                                         | URL de base pour la lecture             |
| `emptyStateTitle`       | `string`               | `"Aucune page trouvée"`                      | Titre de l'état vide                    |
| `emptyStateDescription` | `string`               | `"Commencez par créer votre première page."` | Description de l'état vide              |

## Modes d'affichage

### Mode "cards"

- Affichage en grille responsive (1 colonne sur mobile, 2 sur tablette, 3 sur desktop)
- Chaque page est représentée par une carte avec titre, dates et actions
- Hover effects pour une meilleure UX

### Mode "list"

- Affichage en tableau avec colonnes : Titre, Date de création, Dernière modification, Actions
- Plus compact, idéal pour de nombreuses pages
- Tri possible (fonctionnalité future)

## Utilisation

### Utilisation basique

```svelte
<script>
import PagesList from './PagesList.svelte';

let pages = [...]; // Vos pages
let displayMode = 'cards'; // ou 'list'

function handleDelete(id) {
  // Logique de suppression
}
</script>

<PagesList
	{pages}
	isLoading={false}
	{displayMode}
	onDelete={handleDelete}
	editBaseUrl="/dashboard/pages"
	viewBaseUrl="/dashboard/pages"
	emptyStateTitle="Aucune page trouvée"
	emptyStateDescription="Créez votre première page."
/>
```

### Utilisation avec ViewModeToggle et persistance

```svelte
<script>
import { PagesList, ViewModeToggle } from './components/index.js';
import { persistedState } from '$lib/utils/local-state.svelte.js';

let pages = [...]; // Vos pages

// Mode d'affichage persisté
const viewModeStore = persistedState('my-pages-view-mode', 'cards');
let viewMode = $derived(viewModeStore.value);

function handleViewModeChange(mode) {
  viewModeStore.value = mode;
}

function handleDelete(id) {
  // Logique de suppression
}
</script>

<!-- Toggle pour changer le mode d'affichage -->
<ViewModeToggle currentMode={viewMode} onModeChange={handleViewModeChange} />

<!-- Liste des pages -->
<PagesList
	{pages}
	displayMode={viewMode}
	onDelete={handleDelete}
	editBaseUrl="/dashboard/pages"
	viewBaseUrl="/dashboard/pages"
/>
```

### ViewModeToggle autonome avec auto-sauvegarde

```svelte
<script>
	import { ViewModeToggle } from "./components/index.js";

	// Le composant gère automatiquement la persistance
</script>

<ViewModeToggle
	autoSave={true}
	storageKey="auto-pages-view-mode"
	onModeChange={(mode) => console.log("Mode changé:", mode)}
/>
```

## Actions disponibles

- **Voir** : Lien vers `${viewBaseUrl}/${page.id}?editMode=false`
- **Modifier** : Lien vers `${editBaseUrl}/${page.id}?editMode=true`
- **Supprimer** : Appelle la fonction `onDelete` avec l'ID de la page

## États

### Chargement

Affiche un spinner de chargement centré.

### Vide

Affiche une icône, un titre et une description personnalisables.

### Avec données

Affiche les pages selon le mode sélectionné.

## Accessibilité

- Boutons avec attributs `title` pour les tooltips
- Structure sémantique pour les lecteurs d'écran
- Contrastes respectés selon DaisyUI

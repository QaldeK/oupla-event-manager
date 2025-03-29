# Configuration des collections PocketBase pour l'éditeur collaboratif

## Collections à créer dans PocketBase

Pour que l'éditeur collaboratif fonctionne correctement, vous devez créer les collections suivantes dans l'interface d'administration PocketBase:

### 1. Collection `pads`

Créez une collection avec les champs suivants:

| Nom du champ | Type    | Requis | Description                                         |
|--------------|---------|--------|-----------------------------------------------------|
| title        | text    | Oui    | Titre du pad affiché dans la liste                  |
| content      | file    | Non    | État sérialisé du document Yjs (un seul fichier)    |
| created_by   | relation| Oui    | Relation vers la collection 'users'                 |
| space        | relation| Oui    | Relation vers la collection 'spaces'                |

Règles d'accès recommandées:
- **Authentification**: Autoriser l'accès aux utilisateurs authentifiés uniquement
- **Création**: Utilisateurs authentifiés
- **Lecture**: Membres de l'espace (via règles personnalisées)
- **Mise à jour**: Membres de l'espace
- **Suppression**: Admins ou créateur uniquement

### 2. Collection `pad_updates`

Créez une collection avec les champs suivants:

| Nom du champ | Type    | Requis | Description                                             |
|--------------|---------|--------|---------------------------------------------------------|
| pad          | relation| Oui    | Relation vers la collection 'pads'                      |
| updateData   | file    | Oui    | Données binaires de mise à jour Yjs (un seul fichier)   |
| clientId     | text    | Oui    | ID du client Yjs ayant généré la mise à jour            |

Règles d'accès recommandées:
- **Authentification**: Autoriser l'accès aux utilisateurs authentifiés uniquement
- **Création**: Membres de l'espace du pad lié
- **Lecture**: Membres de l'espace du pad lié
- **Mise à jour**: Pas besoin (créer de nouveaux enregistrements à chaque fois)
- **Suppression**: Automatique via règles de nettoyage (optionnel)

## Configuration de nettoyage (Optionnel)

Pour éviter une accumulation excessive d'enregistrements dans `pad_updates`, vous pouvez mettre en place un nettoyage automatique:

1. Ajouter un champ `created` (type: date) à la collection `pad_updates` avec valeur par défaut `now()`.
2. Créer une tâche cron externe ou un hook PocketBase qui supprime les enregistrements plus anciens qu'une certaine période (par exemple, 24 heures ou 7 jours) puisque l'état complet est régulièrement sauvegardé dans `pads.content`.

## Bibliothèques requises

Pour que l'éditeur collaboratif fonctionne, les bibliothèques suivantes doivent être installées:

```bash
npm install @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor yjs
```

Ces bibliothèques complètent les dépendances existantes du projet, notamment `@friendofsvelte/tipex` qui est déjà utilisée.
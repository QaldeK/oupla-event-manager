/**
 * Gestionnaire des options et configurations d'un espace
 *
 * @module spaceOptions
 *
 * Exports principaux:
 * - loadSpaceOptions: Charge la configuration d'un espace
 * - loadUsersSpaceFromPb: Charge les utilisateurs d'un espace
 * - cleanDeletedRecords: Nettoie les enregistrements supprimés du store local
 * - getSpace: Objet pour accéder et modifier la configuration
 *
 * Exemple d'utilisation:
 *
  // Charger la configuration d'un espace
  await loadSpaceOptions("espace_123");

  // Nettoyer les enregistrements supprimés
  await cleanDeletedRecords(eventsStore, "events");

  // Accéder à la configuration
  const config = getSpace.config;
  const rooms = getSpace.rooms;

  // Mettre à jour partiellement la configuration
  getSpace.updatePartial({
    rooms: [...getSpace.rooms, newRoom]
  });
 *
 *
 * L'objet getSpace expose les propriétés:
 * - config: Configuration complète de l'espace
 * - id: Identifiant de l'espace
 * - rooms: Liste des salles
 * - categories: Liste des catégories
 * - tasks: Configuration des tâches
 * - users: Liste des utilisateurs de l'espace
 *
 * Les données sont automatiquement synchronisées avec le localStorage
 * et peuvent être rechargées depuis PocketBase si nécessaire.
 */
// FIXIT : N'est pas actualisé lorsque changement depuis Pocketbase
import { pb } from "$lib/pocketbase.svelte";
import type {
	SpaceMembersResponse,
	SpacesOptionsResponse,
	SpacesResponse,
	UsersResponse
} from "$lib/types/pocketbase";

// Type local pour garantir la présence de expand.space
type SpacesOptionsWithExpand = SpacesOptionsResponse & {
	expand?: {
		space?: SpacesResponse;
	};
};
import type {
	PublicSpaceInfo,
	SpaceConfig,
	SpaceDetails,
	SpaceUser,
	TaskType
} from "$lib/types/types";

// Classe pour gérer les membres séparément
class SpaceMembersManager {
	private members: SpaceUser[] = [];

	async loadMembers(spaceId: string) {
		const records = await pb
			.collection("spaceMembers")
			.getFullList<SpaceMembersResponse<{ user: UsersResponse }>>({
				filter: `space="${spaceId}"`,
				expand: "user"
			});

		this.members = records.map((record) => ({
			id: record.expand?.user.id,
			username: record.expand?.user.username,
			email: record.expand?.user.email,
			role: record.role
		}));

		return this.members;
	}

	getMembers() {
		return this.members;
	}

	// Autres méthodes de gestion des membres...
}

class SpaceOptionsDB {
	private optionOf: SpaceDetails | null = null;
	private membersManager = new SpaceMembersManager();
	private isPublicMode = false;

	constructor() {
		this.loadSpaceOptions = this.loadSpaceOptions.bind(this);
	}

	// Nouvelle méthode pour charger les options en mode public
	async loadPublicOptions(spaceId: string) {
		this.isPublicMode = true;
		try {
			const record = await pb
				.collection("spaces_options")
				.getFirstListItem<SpacesOptionsWithExpand>(`space="${spaceId}"`, {
					expand: "space"
				});

			if (!record.public_site) {
				throw new Error("Ce site n'est pas accessible publiquement");
			}

			_spaceConfig = {
				id: record.space,
				configId: record.id,
				name: record.expand?.space?.name || "",
				description: record.expand?.space?.description || "",
				rooms: [],
				categories: [],
				members: [], // Vide en mode public
				tasks: [],
				newsletterPublic: "",
				newsletterMembers: ""
			};

			return _spaceConfig;
		} catch (error) {
			console.error("Failed to load public space options:", error);
			throw error;
		}
	}

	// Méthode existante modifiée pour vérifier le mode
	async loadSpaceOptions(spaceId: string, publicMode = false) {
		if (publicMode) {
			return this.loadPublicOptions(spaceId);
		}

		this.isPublicMode = false;
		console.log("Loading spaceConfig for space:", spaceId);

		try {
			const localData = await this.get(spaceId);

			if (localData) {
				console.log("Loaded initial config from localStorage", localData);
				_spaceConfig = localData;
			}

			await this.refreshFromPocketBase(spaceId);
			return _spaceConfig;
		} catch (error) {
			console.error("Failed to load space options:", error);
			throw error;
		}
	}

	async get(spaceId: string): Promise<SpaceConfig | null> {
		const config = localStorage.getItem(`spaceOptions_${spaceId}`);
		return config ? JSON.parse(config) : null;
	}

	async set(spaceOptions: SpaceConfig): Promise<void> {
		localStorage.setItem(`spaceOptions_${spaceOptions.id}`, JSON.stringify(spaceOptions));
	}

	private async refreshFromPocketBase(spaceId: string): Promise<void> {
		try {
			// Charger les options de l'espace
			const record = await pb
				.collection("spaces_options")
				.getFirstListItem<SpacesOptionsWithExpand>(`space="${spaceId}"`, {
					expand: "space"
				});

			// Charger les membres
			const members = await this.membersManager.loadMembers(spaceId);

			const newConfigId = record.id;

			// Utiliser directement les champs dédiés
			const rooms = Array.isArray(record.rooms) ? record.rooms : [];
			const categories = Array.isArray(record.categories) ? record.categories : [];
			const tasks = Array.isArray(record.tasks) ? record.tasks : [];
			const newsletterPublic = record.newsletterPublic;
			const newsletterMembers = record.newsletterMembers;
			const mailContactSpace = record.mailContactSpace;

			this.optionOf = {
				space: {
					id: record.space,
					name: record.expand?.space?.name || "",
					description: record.expand?.space?.description || ""
				}
			};

			const newConfig: SpaceConfig = {
				id: record.space,
				configId: newConfigId,
				name: this.optionOf.space.name,
				description: this.optionOf.space.description,
				rooms,
				categories: categories || [],
				tasks: tasks || [],
				members: members || [],
				newsletterMembers,
				newsletterPublic,
				mailContactSpace,
				space: this.optionOf.space
			};

			// Mise à jour du state et du localStorage uniquement si les données ont changé
			const currentData = await this.get(spaceId);
			if (
				!currentData ||
				JSON.stringify(currentData) !== JSON.stringify(newConfig) ||
				currentData.configId !== record.id
			) {
				_spaceConfig = newConfig;
				await this.set(newConfig);
				console.log("Config updated from PocketBase");
			}
		} catch (error) {
			console.error("Failed to refresh from PocketBase:", error);
			throw error;
		}
	}

	// ::: méthode pour accéder uniquement aux catégories (page semi-public proposition notamment)

	async getPublicSpaceInfo(spaceId: string): Promise<PublicSpaceInfo | null> {
		try {
			const record = await pb
				.collection("spaces_options")
				.getFirstListItem<SpacesOptionsWithExpand>(`space="${spaceId}"`, {
					expand: "space"
				});

			if (!record.public_site) {
				throw new Error("Ce site n'est pas accessible publiquement");
			}

			const spaceName = record.expand?.space?.name || "";
			return {
				id: record.space,
				name: spaceName,
				url: spaceName
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-+|-+$/g, ""),
				description: record.expand?.space?.description || "",
				categories: Array.isArray(record.categories) ? record.categories : [],
				rooms: Array.isArray(record.rooms) ? record.rooms : [],
				public_site: record.public_site
			};
		} catch (error) {
			console.error("Failed to load public space info:", error);
			return null;
		}
	}
}

export const spaceOptionsDB = new SpaceOptionsDB();
export const loadSpaceOptions = spaceOptionsDB.loadSpaceOptions;
export const getPublicSpaceInfo = spaceOptionsDB.getPublicSpaceInfo.bind(spaceOptionsDB);

let _spaceConfig = $state<SpaceConfig>({
	id: "",
	configId: "",
	name: "",
	description: "",
	rooms: [],
	categories: [],
	members: [],
	tasks: [],
	newsletterMembers: "",
	newsletterPublic: "",
	mailContactSpace: ""
});

export const getSpace = {
	get config() {
		return _spaceConfig;
	},
	async updateConfig(newConfig: SpaceConfig) {
		if (newConfig.space) {
			try {
				// Mise à jour uniquement des champs dédiés
				const updateData = {
					rooms: newConfig.rooms,
					categories: newConfig.categories,
					tasks: newConfig.tasks
				};

				// Effectuer la mise à jour
				await pb.collection("spaces_options").update(newConfig.configId, updateData);

				// Mise à jour du state local
				_spaceConfig = newConfig;

				// Mise à jour localStorage
				await spaceOptionsDB.set(newConfig);

				return true;
			} catch (error) {
				console.error("Failed to update space config:", error);
				throw error;
			}
		} else {
			throw new Error("Invalid space configuration");
		}
	},

	get id() {
		return _spaceConfig.id;
	},

	get rooms() {
		return _spaceConfig.rooms;
	},

	get categories() {
		return _spaceConfig.categories;
	},

	get tasks(): TaskType[] {
		return _spaceConfig.tasks;
	},

	get defaultTask(): TaskType {
		const defaultTask = _spaceConfig.tasks.find((task) => task.isDefault === true);
		// Si aucune tâche par défaut n'est trouvée, créez une tâche par défaut
		if (!defaultTask && _spaceConfig.tasks.length === 0) {
			return {
				name: "Here",
				description: "Tâche par défaut automatiquement créée",
				type: "onEvent"
			};
		}
		return defaultTask || _spaceConfig.tasks[0];
	},

	get name() {
		return _spaceConfig.name;
	},

	get description() {
		return _spaceConfig.description;
	},

	updatePartial(updates: Partial<SpaceConfig>) {
		_spaceConfig = { ..._spaceConfig, ...updates };
	},

	get members() {
		return _spaceConfig.members;
	},

	get newsletterPublic() {
		return _spaceConfig.newsletterPublic;
	},

	get newsletterMembers() {
		return _spaceConfig.newsletterMembers;
	},

	get mailContactSpace() {
		return _spaceConfig.mailContactSpace;
	}
};

/**
 * Nettoie les enregistrements supprimés dans le store local en se basant sur les informations
 * stockées dans spaces_options.deleted_records.
 *
 * @param store Le SyncStore à nettoyer
 * @param collectionName Le nom de la collection à vérifier
 * @returns Promise<number> Nombre d'enregistrements supprimés
 */
// export async function cleanDeletedRecords<T extends { id: string }>(
// 	store: SyncStore<T>,
// 	collectionName: Collections
// ): Promise<number> {
// 	try {
// 		// Vérifier que le store est initialisé
// 		if (!store.isInitialized) {
// 			console.warn(
// 				"Le store n'est pas initialisé, impossible de nettoyer les enregistrements supprimés"
// 			);
// 			return 0;
// 		}

// 		// Récupérer les options de l'espace avec le champ deleted_records
// 		const spaceRecord = await pb
// 			.collection('spaces_options')
// 			.getFirstListItem<SpacesOptionsResponse>(`space="${getSpace.id}"`);

// 		// Si le champ deleted_records n'existe pas
// 		if (!spaceRecord.deleted_records) {
// 			console.log('Aucun enregistrement supprimé à traiter');
// 			return 0;
// 		}

// 		// Analyser le JSON des enregistrements supprimés
// 		const deletedRecords = JSON.parse(spaceRecord.deleted_records as string) as DeletedRecords;

// 		// Vérifier si la collection existe dans les données supprimées
// 		if (!deletedRecords[collectionName]) {
// 			console.log(`Aucun enregistrement supprimé pour la collection ${collectionName}`);
// 			return 0;
// 		}

// 		const { ids } = deletedRecords[collectionName];
// 		if (!ids || !ids.length) {
// 			return 0;
// 		}

// 		// Compter combien d'IDs sont effectivement présents dans le store local
// 		let deletedCount = 0;

// 		// Supprimer chaque enregistrement du store local
// 		for (const id of ids) {
// 			// Vérifier si l'enregistrement existe dans le store
// 			if (store.get(id)) {
// 				// Supprimer l'enregistrement du store
// 				await store.destroyRecord(id);
// 				deletedCount++;
// 			}
// 		}

// 		console.log(`${deletedCount} enregistrements supprimés de la collection ${collectionName}`);
// 		return deletedCount;
// 	} catch (error) {
// 		console.error('Erreur lors du nettoyage des enregistrements supprimés :', error);
// 		return 0;
// 	}
// }

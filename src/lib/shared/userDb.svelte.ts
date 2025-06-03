/*USAGE
<script lang="ts">
    import { userDb } from './userDb.svelte';

    // Accès aux données
    console.log(userDb.current);
    console.log(userDb.isAuthenticated);
    console.log(userDb.currentSpace);

    // Utilisation des méthodes
    async function handleLogin() {
        try {
            await userDb.login('email@example.com', 'password');
        } catch (error) {
            console.error('Login failed:', error);
        }
    }
</script>

{#if userDb.isAuthenticated}
    <p>Welcome {userDb.current?.username}</p>
    <button onclick={userDb.logout}>Logout</button>
{/if}
*/
import type { UserType } from "$lib/types/types";
import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

class UserDB {
	private userData: UserType | null = null;
	private initialized: boolean = false;

	constructor() {
		// Écouter les changements d'auth nativement
		pb.authStore.onChange((token, record) => {
			if (!token || !record) {
				this.userData = null;
				this.initialized = false;
			}
		});
	}

	// Getters
	get current() {
		return this.userData;
	}

	get isAuthenticated() {
		return this.userData !== null;
	}

	get currentSpace() {
		return this.userData?.currentSpace || "";
	}

	get currentRole() {
		if (!this.userData!.currentSpace) return null;
		return (
			this.userData!.memberOf?.find((space) => space.id === this.userData!.currentSpace!.id)
				?.role || null
		);
	}
	get memberOf() {
		return this.userData?.memberOf || [];
	}

	get id() {
		return this.userData?.id || "";
	}

	// Méthodes privées

	private async buildFullUserInfo(baseUserRecord: any): Promise<UserType> {
		const memberOfResponse = await pb.collection("spaceMembers").getFullList({
			filter: `user = "${baseUserRecord!.id}"`,
			expand: "space"
		});

		return {
			...baseUserRecord,
			memberOf: memberOfResponse.map((space) => {
				if (!space.expand?.space) {
					throw new Error("Espace non trouvé");
				}
				return {
					id: space.expand.space.id,
					name: space.expand.space.name,
					role: space.role
				};
			}),
			currentSpace: memberOfResponse[0]?.expand?.space,
			currentRole: memberOfResponse[0]?.role
		};
	}

	private async updateUserData(userInfo: UserType) {
		this.userData = userInfo;
		this.setToStorage(userInfo);
		return userInfo;
	}

	private setToStorage(userInfo: UserType) {
		if (userInfo) {
			// S'assurer que toutes les données nécessaires sont incluses
			const currentAuth = {
				...userInfo,
				memberOf: userInfo.memberOf,
				currentSpace: userInfo.currentSpace,
				currentRole: userInfo.currentRole,
				collectionName: "users",
				collectionId: ""
			};
			const token = pb.authStore.token;
			pb.authStore.save(token, currentAuth);
		}
	}

	// Méthodes principales
	async initializeUserData(): Promise<UserType | null> {
		if (this.initialized && this.userData) {
			return this.userData;
		}

		try {
			if (!pb.authStore.isValid) {
				return null;
			}

			// Vérifier la validité du token avec le serveur
			// await pb.collection('users').authRefresh();

			const userInfo = await this.buildFullUserInfo(pb.authStore.record);
			this.userData = userInfo;
			this.initialized = true;
			return userInfo;
		} catch (error) {
			console.error("Erreur d'initialisation:", error);
			pb.authStore.clear();
			return null;
		}
	}

	async login(email: string, password: string): Promise<UserType> {
		try {
			console.log("login...");
			// Authentification avec PocketBase
			const authData = await pb.collection("users").authWithPassword(email, password);

			if (!pb.authStore.record) {
				throw new Error("Authentification échouée");
			}

			const userInfo = await this.buildFullUserInfo(authData.record);
			await this.updateUserData(userInfo);

			return userInfo;
		} catch (error) {
			console.error("Login error:", error);
			throw error;
		}
	}

	async refresh() {
		if (!pb.authStore.isValid) {
			return;
		}

		await pb.collection("users").authRefresh();

		if (pb.authStore.record) {
			const userInfo = await this.buildFullUserInfo(pb.authStore.record);
			await this.updateUserData(userInfo);
		}
	}

	logout() {
		this.userData = null;
		this.initialized = false;
	}

	async register(username: string, email: string, password: string): Promise<UserType> {
		try {
			// Création du compte
			const data = {
				username,
				email,
				password,
				passwordConfirm: password,
				emailVisibility: true
			};

			await pb.collection("users").create(data);

			// Attendre un peu avant la connexion
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Connexion avec les nouveaux identifiants
			const authData = await pb.collection("users").authWithPassword(email, password);

			if (!pb.authStore.record) {
				throw new Error("Authentification échouée après inscription");
			}

			const userInfo = await this.buildFullUserInfo(authData.record);
			await this.updateUserData(userInfo);

			return userInfo;
		} catch (error) {
			console.error("Register error:", error);
			throw error;
		}
	}
}

// Création de l'instance unique
export { pb }; // on initie et export pb depuis ici pour qu'il soit disponible au constructeur
const userDBInstance = new UserDB();
export const userDb = userDBInstance;

<script lang="ts">
	import Checkbox from '$lib/components/Checkbox.svelte';
	import Frame from '$lib/components/Frame.svelte';
	import GroupCheckBox from '$lib/components/GroupCheckBox.svelte';
	import Info from '$lib/components/Info.svelte';
	import Quill from '$lib/components/Quill.svelte';
	import TimePickRange from '$lib/components/TimePickRange.svelte';
	import DatePickerProposal from '$lib/components/forModal/DatePickerProposal.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { getNewEvent } from '$lib/constants/events.constants';
	import { pb } from '$lib/pocketbase.svelte';
	import { PropositionFormSchema } from '$lib/schemas/event.schema';
	import { getSpace } from '$lib/shared/spaceOptions.svelte';
	import { userDb } from '$lib/shared/userDb.svelte';
	import { z } from 'zod';

	import { slide } from 'svelte/transition';

	const formSchema = PropositionFormSchema;

	// Utilisation des données de l'espace depuis getSpace
	const spaceName = $derived(getSpace.name);
	const spaceId = $derived(getSpace.id);
	const categories = $derived(getSpace.categories);

	// État du formulaire basé sur newEvent
	let formData = $state({
		...getNewEvent(), // Utilise la fonction pour obtenir les valeurs dynamiques
		// Surcharge des valeurs spécifiques au formulaire de proposition
		is_prix_libre: true,
		isPublic: true,
		is_age_no_restriction: true,
		duree: '01:30',
		external_proposal: {
			period_preference: '',
			proposals: [
				{
					date_event: '',
					time_start: '',
					time_end: '',
					start_event: '',
					selected: false
				}
			]
		}
	});

	let submitted = $state(false);
	let formError = $state<string | null>(null);

	// État d'authentification
	let isAuthenticated = $state(pb.authStore.isValid);
	let email = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let authError = $state('');

	// Validation du mot de passe uniquement pour la correspondance
	let passwordError = $derived(() => {
		if (passwordConfirm && password !== passwordConfirm) {
			return 'Les mots de passe ne correspondent pas';
		}
		return '';
	});

	// Initialisation de space dans un $effect
	$effect(() => {
		formData.space = spaceId;
	});

	// Vérifie si l'email existe déjà
	async function checkEmail() {
		try {
			const result = await pb.collection('users').getFirstListItem(`email="${email}"`);
			return true;
		} catch {
			return false;
		}
	}

	// Gestion de l'authentification
	async function handleAuth(e: SubmitEvent) {
		e.preventDefault();
		authError = '';

		try {
			const emailExists = await checkEmail();

			if (emailExists) {
				// Connexion pour utilisateur existant
				await userDb.login(email, password);
			} else {
				// Vérification du mot de passe pour les nouveaux utilisateurs
				if (!passwordConfirm) {
					authError = 'Veuillez confirmer votre mot de passe pour créer un compte';
					return;
				}

				if (password.length < 8) {
					authError = 'Le mot de passe doit contenir au moins 8 caractères';
					return;
				}

				if (password !== passwordConfirm) {
					authError = 'Les mots de passe ne correspondent pas';
					return;
				}

				// Inscription
				try {
					// Création du compte et connexion automatique
					const user = await userDb.register(email, password);

					// Création du membre externe
					await pb.collection('spaceMembers').create({
						user: user.id,
						space: spaceId,
						role: 'external'
					});
				} catch (registerError) {
					console.error('Register error:', registerError);
					throw new Error(
						"Erreur lors de l'inscription : " +
							(registerError instanceof Error ? registerError.message : 'Erreur inconnue')
					);
				}
			}

			isAuthenticated = true;
			authError = '';
		} catch (error) {
			console.error('Auth error:', error);
			authError = error instanceof Error ? error.message : "Erreur d'authentification";
		}
	}

	// Validation et soumission
	async function handleSubmit() {
		try {
			const validatedData = formSchema.parse(formData);
			const eventData = {
				...getNewEvent(), // Utilise la fonction pour obtenir les valeurs dynamiques
				...validatedData
			};

			try {
				const result = await pb.collection('events').create(eventData);
				submitted = true;
				formError = null;
			} catch (pbError) {
				console.error('Erreur PocketBase:', pbError);
				throw pbError;
			}
		} catch (e) {
			console.error("Type d'erreur:", e.constructor.name);
			console.error('Erreur complète:', e);
			if (e instanceof z.ZodError) {
				console.error('Erreurs de validation Zod:', e.errors);
				formError = e.errors[0].message;
			} else {
				formError = e.message || "Une erreur s'est produite lors de l'envoi du formulaire";
			}
		}
	}

	// Gestion des propositions de dates
	function addProposal() {
		formData.external_proposal.proposals = [
			...formData.external_proposal.proposals,
			{
				date_event: '',
				time_start: '',
				time_end: '',
				start_event: '',
				selected: false
			}
		];
	}

	function removeProposal(index: number) {
		formData.external_proposal.proposals = formData.external_proposal.proposals.filter(
			(_, i) => i !== index
		);
	}

	// Options de durée (30min à 4h par tranches de 30min)
	const dureeOptions = Array.from({ length: 8 }, (_, i) => {
		const minutes = (i + 1) * 30;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		const value = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
		const label = mins === 0 ? `${hours}h` : `${hours}h${mins}`;
		return { value, label };
	});

	// Calcul automatique de l'heure de fin basé sur l'heure de début et la durée
	$effect(() => {
		formData.external_proposal.proposals.forEach((proposal) => {
			if (proposal.time_start && formData.duree) {
				const [startHours, startMinutes] = proposal.time_start.split(':').map(Number);
				const [durationHours, durationMinutes] = formData.duree.split(':').map(Number);

				let totalMinutes = startMinutes + durationMinutes;
				let totalHours = startHours + durationHours + Math.floor(totalMinutes / 60);
				totalMinutes = totalMinutes % 60;

				if (totalHours >= 24) totalHours = totalHours - 24;

				proposal.time_end = `${totalHours.toString().padStart(2, '0')}:${totalMinutes.toString().padStart(2, '0')}`;
			}
		});
	});

	// Assurer qu'il y a toujours au moins une proposition
	$effect(() => {
		if (formData.external_proposal.proposals.length === 0) {
			addProposal();
		}
	});
</script>

<div class="container mx-auto max-w-2xl p-4">
	<h1 class="mb-6 text-2xl font-bold">
		Proposer un événement pour {spaceName}
	</h1>

	{#if !isAuthenticated}
		<div class="mb-6 rounded-lg border bg-gray-50 p-6">
			<h2 class="mb-4 text-xl font-semibold">Identification requise</h2>
			<form onsubmit={handleAuth} class="space-y-4">
				<div>
					<label for="email" class="text-fluid-sm mb-2 block font-medium">Email</label>
					<Input type="email" id="email" bind:value={email} required />
				</div>
				<div>
					<label for="password" class="text-fluid-sm mb-2 block font-medium">Mot de passe</label>
					<Input type="password" id="password" bind:value={password} required />
				</div>
				<div>
					<label for="passwordConfirm" class="text-fluid-sm mb-2 block font-medium">
						Confirmation du mot de passe
						<span class="text-fluid-sm text-gray-500"
							>(si vous n'êtes pas déjà inscrit sur oupla)</span
						>
					</label>
					<Input type="password" id="passwordConfirm" bind:value={passwordConfirm} />
				</div>
				{#if authError}
					<div class="text-fluid-sm text-red-600">{authError}</div>
				{/if}
				<Button type="submit" class="w-full">S'identifier</Button>
			</form>
		</div>
	{/if}

	{#if submitted}
		<div class="mb-4 border-l-4 border-green-500 bg-green-100 p-4 text-green-700">
			<p>Votre proposition d'événement a été envoyée avec succès !</p>
		</div>
	{:else}
		{#if formError}
			<div class="mb-4 border-l-4 border-red-500 bg-red-100 p-4 text-red-700">
				<p>{formError}</p>
			</div>
		{/if}

		<form
			onsubmit={handleSubmit}
			class="space-y-6"
			class:opacity-50={!isAuthenticated}
			class:pointer-events-none={!isAuthenticated}
		>
			<div class="space-y-8">
				<div>
					<label for="event_title" class="text-fluid-sm mb-2 block font-medium">
						Titre de l'événement *
					</label>
					<Input
						type="text"
						id="event_title"
						bind:value={formData.event_title}
						placeholder="Nom de votre événement"
						required
					/>
				</div>
				<div>
					<label for="periodPreference" class="text-fluid-sm mb-2 block font-medium">
						Préférence de période (optionnel)
					</label>
					<Textarea
						id="periodPreference"
						bind:value={formData.external_proposal.period_preference}
						placeholder="Ex: Plutot fin avril, un vendredi ou un samedi. c'est possible aussi fin mai..."
					/>
				</div>
				<!-- Section des propositions de dates -->
				<Frame title="Proposer une ou plusieurs dates" class_title="bg-gray-50" class_frame="mb-8">
					<Info>
						<p>
							Si vous avez des dates précises à proposer pour lesquelles vous êtes disponibles,
							indiquez-les ici. Si ce n'est pas possible pour nous sur ces dates, nous vous
							enverrons d'autres propositions.
						</p>
					</Info>
					<div class="divide-accent mt-4 space-y-4 divide-y-2">
						{#each formData.external_proposal.proposals as proposal, i}
							<div>
								<div class="mb-4 grid grid-cols-1 gap-y-4">
									<div class=" flex items-center justify-between">
										<DatePickerProposal
											bind:value={proposal.date_event}
											label="Date"
											placeholder="Selectionnez une date"
										/>
										{#if formData.external_proposal.proposals.length > 1}
											<Button variant="outline" size="sm" onclick={() => removeProposal(i)}>
												Supprimer
											</Button>
										{/if}
									</div>
									<div class="grid grid-cols-1 items-start gap-x-4 sm:grid-cols-2">
										<div class="space-y-1">
											<TimePickRange
												bind:value={proposal.time_start}
												label="Heure de l'installation"
												initial="17:00"
												minTime="06:00"
												classAdd="w-full"
											/>
											<p class="text-fluid-sm text-gray-500 italic">
												heure à laquelle vous souhaiteriez arriver dans le lieu pour mettre en place
												l'événement
											</p>
										</div>
										<div class="space-y-1">
											<TimePickRange
												bind:value={proposal.start_event}
												label="Heure de début"
												initial={proposal.time_start}
												minTime={proposal.time_start}
												classAdd="w-full"
											/>
											<p class="text-fluid-sm text-gray-500 italic">
												heure à laquelle vous souhaitez commencer le spectacle/l'intervention
											</p>
										</div>
									</div>
								</div>
							</div>
						{/each}
						<Button variant="outline" onclick={addProposal} class="w-full">
							Ajouter une autre proposition
						</Button>
					</div>
				</Frame>
				<!-- Catégories -->
				<Frame title="Type d'événement" class_title="bg-gray-50" class_frame="mb-8">
					<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
						<GroupCheckBox groupItems={categories} bind:eventDataGroup={formData.categories} />
					</div>
				</Frame>
				<!-- Options de l'événement -->
				<Frame class_frame="mb-4">
					<div class="flex flex-col gap-4 md:flex-row">
						<div class="flex flex-1 flex-col gap-1">
							<Checkbox label="Prix libre" id="prix_libre" bind:checked={formData.is_prix_libre} />
							{#if !formData.is_prix_libre}
								<label for="prix" class="flex" transition:slide>
									<input
										type="text"
										class="text-md flex flex-1 rounded border border-gray-300 p-2 focus:ring-indigo-500"
										id="prix"
										placeholder="Prix ?"
										bind:value={formData.prix}
									/>
								</label>
							{/if}
						</div>
						<div class="flex flex-1 flex-col gap-1">
							<Checkbox label="Mixité" id="ismixite" bind:checked={formData.isMixiteChoisie} />
							{#if formData.isMixiteChoisie}
								<label for="mixite" class="flex" transition:slide>
									<input
										type="text"
										class="text-md flex flex-1 rounded border border-gray-300 p-2 focus:ring-indigo-500"
										id="mixite"
										bind:value={formData.mixite}
										placeholder="Décrivez le type de mixité"
									/>
								</label>
							{/if}
						</div>
						<div class="flex flex-1 flex-col gap-1">
							<Checkbox
								label="Tout public"
								id="all_public"
								bind:checked={formData.is_age_no_restriction}
							/>
							{#if !formData.is_age_no_restriction}
								<label for="age" class="flex" transition:slide>
									<input
										type="number"
										class="text-md flex flex-1 rounded border border-gray-300 p-2 focus:ring-indigo-500"
										id="age"
										placeholder="Age minimum ?"
										bind:value={formData.age_advice}
									/>
								</label>
							{/if}
						</div>
					</div>
					<div>
						<Checkbox
							label="Evénement public"
							id="public_event"
							bind:checked={formData.isPublic}
							help="Les événements non-public ne seront pas visible sur le site ni ajouté à la newsletter"
						/>
					</div>
				</Frame>
				<!-- Description publique -->
				<div class="space-y-2">
					<h3 class="text-lg font-medium">Description publique *</h3>
					<Info>
						<p>
							Présentation de l'événement, déstiné au public (pour diffusion sur la Newsletter, le
							site, etc.). Inutile de renseigner le titre, la date, les horaires, prix, mixité, etc.
							<span class="text-fluid-sm">
								(ce sera automatiquement ajoutés et mis en forme lors de la génération de la
								newsletter et du site)
							</span>
						</p>
					</Info>
					<Quill bind:dataContent={formData.desc_public} />
				</div>
				<!-- Durée globale -->
				<div class="mb-6 flex flex-col gap-2">
					<label for="duree" class="text-fluid-sm font-medium text-gray-700">
						Durée de l'événement
					</label>
					<select
						id="duree"
						bind:value={formData.duree}
						class="focus:border-primary-500 w-32 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-700 shadow-sm focus:outline-none"
					>
						{#each dureeOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
				<Button type="submit" class="w-full">Envoyer la proposition</Button>
			</div>
		</form>
	{/if}
</div>

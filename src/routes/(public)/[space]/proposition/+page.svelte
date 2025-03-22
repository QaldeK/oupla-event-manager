<script lang="ts">
	import Checkbox from '$lib/components/Checkbox.svelte';
	import Frame from '$lib/components/Frame.svelte';
	import GroupCheckBox from '$lib/components/GroupCheckBox.svelte';
	import Info from '$lib/components/Info.svelte';
	import Quill from '$lib/components/Quill.svelte';
	import TimePickRange from '$lib/components/TimePickRange.svelte';
	import DatePickerProposal from '$lib/components/forModal/DatePickerProposal.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { getNewEvent } from '$lib/constants/events.constants';
	import { pb } from '$lib/pocketbase.svelte';
	import { PropositionFormSchema } from '$lib/schemas/event.schema';
	import { getSpace } from '$lib/shared/spaceOptions.svelte';
	import { userDb } from '$lib/shared/userDb.svelte';
	import { z } from 'zod';
	import { slide } from 'svelte/transition';
	import { UserPlus, LogIn } from 'lucide-svelte';
	import { showAlert } from '$lib/shared/states.svelte';

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
	let username = $state('');
	let email = $state('***REMOVED***');
	let password = $state('***REMOVED***');
	let passwordConfirm = $state('***REMOVED***');
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

	let activeTab = $state('register'); // 'register' ou 'login'

	// Séparation des handlers pour plus de clarté
	async function handleRegister(e: SubmitEvent) {
		e.preventDefault();
		authError = '';

		try {
			// Création du compte et connexion automatique
			const user = await userDb.register(username, email, password);

			// Création du membre externe
			await pb.collection('spaceMembers').create({
				user: user.id,
				space: spaceId,
				role: 'external'
			});

			isAuthenticated = true;
			authError = '';
			showAlert('Connexion réussie', 'success');
		} catch (error) {
			console.error('Register error:', error);
			authError = error instanceof Error ? error.message : "Erreur d'inscription";
		}
	}

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		authError = '';

		try {
			await userDb.login(email, password);
			isAuthenticated = true;
			authError = '';
			showAlert('Connexion réussie', 'success');
		} catch (error) {
			console.error('Login error:', error);
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

<div class="container mx-auto mb-10 max-w-2xl p-4">
	<h1 class="mb-6 text-2xl font-bold">
		Proposer un événement pour {spaceName}
	</h1>

	{#if !isAuthenticated}
		<div class="card bg-base-200 mb-4 shadow-xl">
			<div class="card-body">
				<h2 class="card-title mb-4">Identification requise</h2>

				<div class="tabs tabs-lift">
					<label class="tab">
						<input
							type="radio"
							name="auth_tabs"
							checked={activeTab === 'register'}
							onchange={() => (activeTab = 'register')}
						/>
						<UserPlus class="me-2 size-4" />
						Créer un compte
					</label>
					<div class="tab-content bg-base-100 border-base-300 p-6">
						<form onsubmit={handleRegister} class="space-y-4">
							<div class="w-full">
								<label for="username" class="floating-label text-lg">
									<span>Nom</span>
									<input
										type="text"
										id="username"
										bind:value={username}
										class="input input-bordered validator w-full"
										placeholder="Votre nom"
										pattern="[A-Za-z][A-Za-z0-9\-]*"
										minlength="3"
										maxlength="30"
										title="Lettres, chiffres ou tirets uniquement"
										required
									/>
									<p class="validator-hint">
										Doit contenir entre 3 et 30 caractères. Uniquement des lettres, chiffres ou
										tirets
									</p>
								</label>
							</div>

							<div class="w-full">
								<label for="register-email" class="floating-label text-lg">
									<span>Email</span>
									<input
										type="email"
										id="register-email"
										bind:value={email}
										class="input input-bordered validator w-full"
										placeholder="votre@email.com"
										required
									/>
									<p class="validator-hint">Format email valide requis</p>
								</label>
							</div>

							<div class="w-full">
								<label for="register-password" class="floating-label text-lg">
									<span>Mot de passe</span>
									<input
										type="password"
										id="register-password"
										bind:value={password}
										class="input input-bordered validator w-full"
										placeholder="Mot de passe"
										required
										minlength="8"
									/>
									<p class="validator-hint">Minimum 8 caractères</p>
								</label>
							</div>

							<div class="w-full">
								<label for="password-confirm" class="floating-label text-lg">
									<span>Confirmer le mot de passe</span>
									<input
										type="password"
										id="password-confirm"
										bind:value={passwordConfirm}
										class="input input-bordered validator w-full"
										pattern={password}
										placeholder="Confirmer votre mot de passe"
										required
									/>
									<p class="validator-hint">Doit être identique au mot de passe</p>
								</label>
							</div>

							<button type="submit" class="btn btn-primary w-full">Créer mon compte</button>
						</form>
					</div>

					<label class="tab">
						<input
							type="radio"
							name="auth_tabs"
							checked={activeTab === 'login'}
							onchange={() => (activeTab = 'login')}
						/>
						<LogIn class="me-2 size-4" />
						S'identifier
					</label>
					<div class="tab-content bg-base-100 border-base-300 p-6">
						<form onsubmit={handleLogin} class="space-y-4">
							<div class="w-full">
								<label for="login-email" class="floating-label text-lg">
									<span>Email</span>
									<input
										type="email"
										id="login-email"
										bind:value={email}
										class="input input-bordered validator w-full"
										placeholder="votre@email.com"
										required
									/>
									<p class="validator-hint">Format email valide requis</p>
								</label>
							</div>

							<div class="w-full">
								<label for="login-password" class="floating-label text-lg">
									<span>Mot de passe</span>
									<input
										type="password"
										id="login-password"
										bind:value={password}
										class="input input-bordered validator w-full"
										placeholder="Votre mot de passe"
										required
									/>
								</label>
							</div>

							<button type="submit" class="btn btn-primary w-full">Se connecter</button>
						</form>
					</div>
				</div>

				{#if authError}
					<div class="alert alert-error mt-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 shrink-0 stroke-current"
							fill="none"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/></svg
						>
						<span>{authError}</span>
					</div>
				{/if}
			</div>
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
				<div class="flex flex-col gap-y-1">
					<label for="event_title" class=""> Titre de l'événement * </label>
					<input
						type="text"
						id="event_title"
						bind:value={formData.event_title}
						placeholder="Nom de votre événement"
						required
						minlength="3"
						class="input input-lg validator w-full"
					/>
					<p class="validator-hint">Titre requis, minimum 3 caractères</p>
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
				<Frame title="Proposer une ou plusieurs dates" class_frame="mb-8">
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
											<button
												class="btn btn-outline btn-error btn-sm"
												onclick={() => removeProposal(i)}
											>
												Supprimer
											</button>
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
											<p class="text-fluid-xs text-base-content/70 italic">
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
											<p class="text-fluid-xs text-base-content/70 italic">
												heure à laquelle vous souhaitez commencer le spectacle/l'intervention
											</p>
										</div>
									</div>
								</div>
							</div>
						{/each}
						<button type="button" onclick={addProposal} class="btn btn-outline btn-block">
							Ajouter une autre proposition
						</button>
					</div>
				</Frame>
				<!-- Catégories -->
				<Frame title="Type d'événement" class_frame="mb-8">
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
										class="text-md input"
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
										class="text-md input"
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
										class="text-md input"
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
				<button type="submit" class="btn btn-primary btn-block">Envoyer la proposition</button>
			</div>
		</form>
	{/if}
</div>

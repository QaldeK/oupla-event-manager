<script lang="ts">
	import Checkbox from "$lib/components/Checkbox.svelte";
	import Frame from "$lib/components/Frame.svelte";
	import GroupCheckBox from "$lib/components/GroupCheckBox.svelte";
	import Info from "$lib/components/Info.svelte";
	import { Textarea } from "$lib/components/ui/textarea";
	import { getNewEvent } from "$lib/services/eventActions";
	import { pb } from "$lib/pocketbase.svelte";
	import { slide } from "svelte/transition";
	import { X, UserPlus, LogIn } from "lucide-svelte";
	import { showAlert } from "$lib/shared/states.svelte";
	import { publicStore } from "$lib/shared/publicStore.svelte";
	import { userDb } from "$lib/shared";
	import { validateProposition } from "$lib/validation/proposition-validator.svelte";
	import { Tipex, type TipexEditor } from "@friendofsvelte/tipex";
	import SimpleTiptapToolbar from "$lib/components/SimpleTiptapToolbar.svelte";
	import "@friendofsvelte/tipex/styles/index.css";

	import DatePicker from "$lib/components/forModal/DatePicker.svelte";
	import { lisibleDateShort, isMobile } from "$lib/utils";

	let is_mobile = $derived(isMobile.current);
	let editor: TipexEditor | undefined = $state();

	const spaceInfo = $derived(publicStore.spaceInfo);

	// Utilisation des données de l'espace depuis getSpace
	const spaceName = $derived(spaceInfo?.name ?? "");
	const spaceId = $derived(spaceInfo?.id);
	const categories = $derived(spaceInfo?.categories || []);

	// État du formulaire basé sur getNewEvent()
	let formData = $state({
		...getNewEvent(), // Utilise la fonction pour obtenir les valeurs dynamiques
		// Surcharge des valeurs spécifiques au formulaire de proposition
		is_prix_libre: true,
		isPublic: true,
		is_age_no_restriction: true,
		categories: [],
		duree: "01:30",
		external_proposal: {
			message: "",
			period_preference: "",
			proposals: [
				{
					date_event: "",
					time_start: "",
					time_end: "",
					start_event: "",
					selected: false
				}
			]
		}
	});

	// Variables pour le système simplifié de sélection de dates
	let selectedDates = $state<string[]>([]); // Dates sélectionnées depuis le DatePicker
	let defaultStartTime = $state("17:00"); // Heure d'installation par défaut
	let defaultEventTime = $state("18:00"); // Heure de début événement par défaut

	// Structure pour stocker les horaires individuels de chaque date
	let dateProposals = $state<
		Record<string, { time_start: string; start_event: string; time_end: string }>
	>({});

	let submitted = $state(false);
	let formError = $state<string | null>(null);

	// État d'authentification
	let isAuthenticated = $state(pb.authStore.isValid);
	let username = $state("");
	let email = $state("");
	let password = $state("");
	let passwordConfirm = $state("");
	let authError = $state("");

	// Validation du mot de passe uniquement pour la correspondance

	// Initialisation de space dans un $effect
	$effect(() => {
		// S'assurer que spaceId est défini avant de l'affecter
		if (spaceId) {
			formData.space = spaceId;
		}
	});

	let activeTab = $state("register"); // 'register' ou 'login'

	// Séparation des handlers pour plus de clarté
	async function handleRegister(e: SubmitEvent) {
		e.preventDefault();
		authError = "";

		try {
			// Création du compte et connexion automatique
			const user = await userDb.register(username, email, password);

			// Création du membre externe
			// FIXIT Security: passer par un hook ?
			await pb.collection("spaceMembers").create({
				user: user.id,
				space: spaceId,
				role: "external"
			});

			isAuthenticated = true;
			authError = "";
			showAlert("Connexion réussie", "success");
		} catch (error) {
			console.error("Register error:", error);
			authError = error instanceof Error ? error.message : "Erreur d'inscription";
		}
	}

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		authError = "";

		try {
			await userDb.login(email, password);
			isAuthenticated = true;
			authError = "";
			showAlert("Connexion réussie", "success");
		} catch (error) {
			console.error("Login error:", error);
			authError = error instanceof Error ? error.message : "Erreur d'authentification";
		}
	}

	// Validation et soumission
	async function handleSubmit() {
		formError = null;

		// Préparer les dates pour la soumission
		prepareDatesForSubmit();

		// Validation
		const validation = validateProposition(formData);
		const isValid = validation.isValid;

		if (!isValid) {
			formError = validation.errors.join("\n");
			return;
		}

		try {
			const eventData = {
				...getNewEvent(), // Utilise la fonction pour obtenir les valeurs dynamiques
				...formData,
				created_by: pb.authStore.record?.id
			};
			await pb.collection("events").create(eventData);
			submitted = true;
			formError = null;
		} catch (pbError: unknown) {
			console.error("Erreur PocketBase:", pbError);
			formError =
				(pbError as { message?: string }).message ||
				"Une erreur s'est produite lors de l'envoi du formulaire";
		}
	}

	function removeProposal(index: number) {
		selectedDates = selectedDates.filter((_, i) => i !== index);
	}

	function handleDatePickerChange(newValue: string | string[]) {
		const newDates = Array.isArray(newValue) ? newValue : newValue ? [newValue] : [];

		// Ajouter les nouvelles dates avec les horaires par défaut
		newDates.forEach((dateStr) => {
			if (!dateProposals[dateStr]) {
				dateProposals[dateStr] = {
					time_start: defaultStartTime,
					start_event: defaultEventTime,
					time_end: calculateEndTime(defaultEventTime, formData.duree)
				};
			}
		});

		// Supprimer les dates qui ne sont plus sélectionnées
		Object.keys(dateProposals).forEach((dateStr) => {
			if (!newDates.includes(dateStr)) {
				delete dateProposals[dateStr];
			}
		});

		selectedDates = newDates;
	}

	// Transformer les dates au format PocketBase lors du submit
	function prepareDatesForSubmit() {
		const proposals = selectedDates.map((dateStr) => ({
			date_event: dateStr, // Le DatePicker retourne déjà le bon format
			time_start: dateProposals[dateStr]?.time_start || defaultStartTime,
			time_end:
				dateProposals[dateStr]?.time_end || calculateEndTime(defaultEventTime, formData.duree),
			start_event: dateProposals[dateStr]?.start_event || defaultEventTime,
			selected: false
		}));

		formData.external_proposal.proposals = proposals;
	}

	// Calculer l'heure de fin
	function calculateEndTime(startTime: string, duration: string): string {
		const [startHours, startMinutes] = startTime.split(":").map(Number);
		const [durationHours, durationMinutes] = duration.split(":").map(Number);

		let totalMinutes = startMinutes + durationMinutes;
		let totalHours = startHours + durationHours + Math.floor(totalMinutes / 60);
		totalMinutes = totalMinutes % 60;

		if (totalHours >= 24) totalHours = totalHours - 24;

		return `${totalHours.toString().padStart(2, "0")}:${totalMinutes.toString().padStart(2, "0")}`;
	}

	// Mettre à jour l'heure de fin quand l'heure de début ou la durée change
	function updateEndTime(dateStr: string) {
		if (dateProposals[dateStr]?.start_event) {
			dateProposals[dateStr].time_end = calculateEndTime(
				dateProposals[dateStr].start_event,
				formData.duree
			);
		}
	}

	// Mettre à jour toutes les heures de fin quand la durée change
	$effect(() => {
		Object.keys(dateProposals).forEach((dateStr) => {
			if (dateProposals[dateStr]?.start_event) {
				dateProposals[dateStr].time_end = calculateEndTime(
					dateProposals[dateStr].start_event,
					formData.duree
				);
			}
		});
	});

	// Options de durée (30min à 4h par tranches de 30min)
	const dureeOptions = Array.from({ length: 8 }, (_, i) => {
		const minutes = (i + 1) * 30;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		const value = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
		const label = mins === 0 ? `${hours}h` : `${hours}h${mins}`;
		return { value, label };
	});

	// Calcul automatique de l'heure de fin basé sur l'heure de début et la durée
	// FIXIT : datefns + partir de dates_propositions et lancer dans le submit
	// $effect(() => {
	// 	formData.external_proposal.proposals.forEach((proposal) => {
	// 		if (proposal.start_event && formData.duree) {
	// 			const [startHours, startMinutes] = proposal.start_event.split(":").map(Number);
	// 			const [durationHours, durationMinutes] = formData.duree.split(":").map(Number);

	// 			let totalMinutes = startMinutes + durationMinutes;
	// 			let totalHours = startHours + durationHours + Math.floor(totalMinutes / 60);
	// 			totalMinutes = totalMinutes % 60;

	// 			if (totalHours >= 24) totalHours = totalHours - 24;

	// 			proposal.time_end = `${totalHours.toString().padStart(2, "0")}:${totalMinutes.toString().padStart(2, "0")}`;
	// 		}
	// 	});
	// });

	// Ne plus forcer l'ajout automatique d'une proposition vide
	// $effect(() => {
	// 	if (formData.external_proposal.proposals.length === 0) {
	// 		addProposal();
	// 	}
	// });

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		// Mettre à jour la description publique avec le contenu de l'éditeur avec un debounce
		if (debounceTimer) clearTimeout(debounceTimer);
		if (editor) {
			debounceTimer = setTimeout(() => {
				const html = editor!.getHTML();
				if (html !== formData.desc_public) {
					formData.desc_public = html;
				}
			}, 600);
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
							checked={activeTab === "register"}
							onchange={() => (activeTab = "register")}
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
							checked={activeTab === "login"}
							onchange={() => (activeTab = "login")}
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

				<!-- Message -->
				<div class="mb-8">
					<label for="message" class="text-fluid-sm mb-2 font-medium">Message</label>

					<Textarea
						id="message"
						bind:value={formData.external_proposal.message}
						placeholder="Message pour l'équipe de l'espace"
						class="h-92"
					/>
				</div>
				<div class="mb-12">
					<label for="periodPreference" class="text-fluid-sm mb-2 block font-medium">
						Préférence de période
					</label>
					<Textarea
						id="periodPreference"
						bind:value={formData.external_proposal.period_preference}
						placeholder="Ex: Plutot fin avril, un vendredi ou un samedi. c'est possible aussi fin mai..."
					/>
				</div>

				<!-- Section des propositions de dates -->
				<Frame title="Proposer une ou plusieurs dates" class_frame="mb-8 w-full">
					<Info>
						<p>Sélectionnez les dates où vous êtes disponibles.</p>
					</Info>

					<!-- Sélecteur de dates et heures par défaut -->
					<div class="mb-6 space-y-4">
						<div class="mb-6 space-y-4">
							<div class="flex flex-wrap">
								<div class="w-full md:w-3/5">
									<label class="label">
										<span class="label-text font-medium">Sélectionnez des dates</span>
									</label>
									<DatePicker
										mode="multiple"
										position="auto center"
										onChange={handleDatePickerChange}
										placeholder="Cliquez pour sélectionner des dates"
										inline={true}
										label=""
									/>
								</div>
								<div class="mt-8 md:w-2/5">
									<div>
										<label for="default-start-time" class="label">
											<span class="label-text font-medium">Heure d'installation</span>
										</label>
										<input
											id="default-start-time"
											type="time"
											bind:value={defaultStartTime}
											class="input input-bordered w-full"
										/>
										<div class="label">
											<span class="label-text-alt text-xs opacity-70">Arrivée pour installer</span>
										</div>
									</div>
									<div>
										<label for="default-event-time" class="label">
											<span class="label-text font-medium">Début événement</span>
										</label>
										<input
											id="default-event-time"
											type="time"
											bind:value={defaultEventTime}
											class="input input-bordered w-full"
										/>
										<div class="label">
											<span class="label-text-alt text-xs opacity-70">Début du spectacle</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- Boutons pour appliquer les heures par défaut -->
						{#if selectedDates.length > 0}
							<div class="mt-4 flex flex-wrap justify-around gap-2">
								<button
									type="button"
									onclick={() => {
										selectedDates.forEach((dateStr) => {
											dateProposals[dateStr].time_start = defaultStartTime;
										});
									}}
									class="btn btn-outline btn-sm"
								>
									<span class="text-wrap">Appliquer heure d'installation à toutes les dates</span>
								</button>
								<button
									type="button"
									onclick={() => {
										selectedDates.forEach((dateStr) => {
											dateProposals[dateStr].start_event = defaultEventTime;
											updateEndTime(dateStr);
										});
									}}
									class="btn btn-outline btn-sm"
								>
									<span class="text-wrap">Appliquer heure de début à toutes les dates</span>
								</button>
							</div>
						{/if}
						<!-- Tableau des propositions avec horaires modifiables -->
						{#if selectedDates.length > 0}
							{#if !is_mobile}
								<div class="overflow-x-auto">
									<table class="table-zebra table">
										<thead>
											<tr>
												<th>Date</th>
												<th>Installation</th>
												<th>Début événement</th>
												<th class="w-20"></th>
											</tr>
										</thead>
										<tbody>
											{#each selectedDates as dateStr, index (index)}
												<tr>
													<td class="font-medium">{lisibleDateShort(dateStr)}</td>
													<td>
														<input
															type="time"
															bind:value={dateProposals[dateStr].time_start}
															class="input input-bordered w-full max-w-24"
														/>
													</td>
													<td>
														<input
															type="time"
															bind:value={dateProposals[dateStr].start_event}
															class="input input-bordered w-full max-w-24"
															onchange={() => updateEndTime(dateStr)}
														/>
													</td>
													<td>
														<button
															type="button"
															onclick={() => removeProposal(index)}
															class="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10"
															aria-label="Supprimer cette date"
														>
															<X />
														</button>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
								<div class="mt-4 text-center">
									<p class="text-xs opacity-70">
										Les horaires peuvent être modifiés individuellement pour chaque date.
									</p>
								</div>
							{:else}
								<!-- si Desktop -->
								{#each selectedDates as dateStr, index (index)}
									<div class="flex items-center justify-between gap-4 border-b py-2">
										<div class="flex-1">{lisibleDateShort(dateStr)}</div>
										<div class="flex flex-wrap gap-2">
											<fieldset class="fieldset">
												<legend class="fieldset-legend pb-0">installation</legend>
												<input
													type="time"
													bind:value={dateProposals[dateStr].time_start}
													class="input input-bordered w-24"
												/>
											</fieldset>
											<fieldset class="fieldset">
												<legend class="fieldset-legend pb-0">début</legend>
												<input
													type="time"
													bind:value={dateProposals[dateStr].start_event}
													class="input input-bordered w-24"
													onchange={() => updateEndTime(dateStr)}
												/>
											</fieldset>
										</div>
										<button
											type="button"
											onclick={() => removeProposal(index)}
											class="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10"
											aria-label="Supprimer cette date"
										>
											<X />
										</button>
									</div>
								{/each}
							{/if}
						{:else}
							<div class="py-8 text-center opacity-70">
								<p>Aucune date sélectionnée.</p>
								<p class="text-sm">Utilisez le sélecteur de dates ci-dessus.</p>
							</div>
						{/if}
					</div></Frame
				>
				<!-- <Frame title="Proposer une ou plusieurs dates" class_frame="mb-8 w-full">
					<Info>
						<p>
							Si vous avez des dates précises à proposer pour lesquelles vous êtes disponibles,
							indiquez-les ici. Si ce n'est pas possible pour nous sur ces dates, nous vous
							enverrons d'autres propositions.
						</p>
					</Info>
					<div class="divide-accent mt-4 space-y-4 divide-y-2">
						{#each formData.external_proposal.proposals as proposal, i (i)}
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
				</Frame> -->
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
						class="focus:border-primary-500 border-base-300 w-32 rounded-md border bg-white px-3 py-2 text-gray-700 shadow-sm focus:outline-none"
					>
						{#each dureeOptions as option (option)}
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
							site, etc.).
						</p>
					</Info>
					<div class="border-base-300 rounded-lg border">
						<SimpleTiptapToolbar {editor} />

						<Tipex
							body={formData.desc_public}
							bind:tipex={editor}
							controls={false}
							floating={false}
							focal={false}
							autofocus={false}
							class="h-92 w-full"
						></Tipex>
					</div>
				</div>
				<button type="submit" class="btn btn-primary btn-block">Envoyer la proposition</button>
			</div>
		</form>
	{/if}
</div>

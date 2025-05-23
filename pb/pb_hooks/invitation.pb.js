/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/send-invitation", async (e) => {
	let body = e.requestInfo().body;
	const { email, username, invitationToken, space } = body;

	//FIXIT : space undefined ?
	console.log("space", space);

	// Validate email and username (add more robust validation as needed)
	if (!email || !username) {
		throw new Error("Email and username are required.");
	}

	// BUG La création de l'utilisateur est faite dans le composant svelte, parce que ceci ne fonctionne pas.

	// const tempPassword = $security.pseudorandomString(10); // Shorter, random password
	// const invitationToken = $security.randomString(32);
	// const expires = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now

	// let record = new Record('users');

	// record.set('email', email);
	// record.set('username', username);
	// record.set('password', tempPassword);
	// record.set('emailVisibility', true);
	// record.set('invitationToken', invitationToken);
	// record.set('invitationExpires', expires.toISOString());
	// record.set('verified', false);

	// $app.save(record);

	const actionUrl = `${$app.settings().meta.appURL}/auth/invitation-setpassword?mail=${email}&uname=${username}&token=${invitationToken}`;

	$app.newMailClient().send({
		from: {
			address: e.app.settings().meta.senderAddress,
			name: e.app.settings().meta.senderName
		},
		to: [
			{
				address: email,
				name: username
			}
		],
		subject: "Invitation à rejoindre Oupla",
		html: `
                <html>
                <head>
                    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
                </head>
                <body>
                    <h2>Vous avez été invité(e) à rejoindre l'espace ${space} sur Oupla !</h2>
                    <p>Pour accepter l'invitation et configurer votre compte, cliquez sur le lien ci-dessous:</p>
                    <p>Ce lien expirera dans 10 jours.</p>
                    <a href="${actionUrl}">Accepter l'invitation</a>
                </body>
                </html>
            `
	});
});

onRecordAfterUpdateSuccess((e) => {
	console.log("👉 UPDATE INVITATION TOKEN");
	const record = e.record;

	if (record.get("invitationToken") === "used") {
		record.set("invitationToken", null);
		record.set("verified", true);
		$app.save(record);
	}
	e.next();
}, "users");

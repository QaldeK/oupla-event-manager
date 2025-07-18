/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const snapshot = [
			{
				createRule: "",
				deleteRule: null,
				fields: [
					{
						autogeneratePattern: "[a-z0-9]{15}",
						hidden: false,
						id: "text3208210256",
						max: 15,
						min: 15,
						name: "id",
						pattern: "^[a-z0-9]+$",
						presentable: false,
						primaryKey: true,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "pwpyen04",
						max: 25,
						min: 0,
						name: "name",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: false,
						type: "text"
					},
					{
						exceptDomains: null,
						hidden: false,
						id: "e4rnj476",
						name: "mail",
						onlyDomains: null,
						presentable: false,
						required: true,
						system: false,
						type: "email"
					},
					{
						hidden: false,
						id: "s6gkpp5w",
						maxSelect: 1,
						name: "status",
						presentable: false,
						required: false,
						system: false,
						type: "select",
						values: ["1er", "2nd", "collectif", "autre"]
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "ie6pz2a8",
						max: 25,
						min: 0,
						name: "space",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						hidden: false,
						id: "autodate2990389176",
						name: "created",
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: false,
						type: "autodate"
					},
					{
						hidden: false,
						id: "autodate3332085495",
						name: "updated",
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: false,
						type: "autodate"
					}
				],
				id: "ht418buovyl73vb",
				indexes: ["CREATE UNIQUE INDEX `idx_p3Fm5vJ` ON `benevoles` (\n  `mail`,\n  `name`\n)"],
				listRule: "",
				name: "benevoles",
				system: false,
				type: "base",
				updateRule: "",
				viewRule: ""
			},
			{
				createRule: "@request.auth.id != '' ",
				deleteRule: "@request.auth.id != '' && space.spaceMembers_via_space.role = 'admin'",
				fields: [
					{
						autogeneratePattern: "[a-z0-9]{15}",
						hidden: false,
						id: "text3208210256",
						max: 15,
						min: 15,
						name: "id",
						pattern: "^[a-z0-9]+$",
						presentable: false,
						primaryKey: true,
						required: true,
						system: true,
						type: "text"
					},
					{
						cascadeDelete: false,
						collectionId: "x9nemirbltqou9s",
						hidden: false,
						id: "fbsdvhu5",
						maxSelect: 1,
						minSelect: 0,
						name: "space",
						presentable: false,
						required: false,
						system: false,
						type: "relation"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "g9igkuli",
						max: 255,
						min: 0,
						name: "event_title",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: false,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "l6sfwrn6",
						max: 10,
						min: 10,
						name: "date_event",
						pattern: "",
						presentable: true,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						hidden: false,
						id: "hvqk4vfi",
						name: "isConfirmed",
						presentable: false,
						required: false,
						system: false,
						type: "bool"
					},
					{
						hidden: false,
						id: "fbmy7tyv",
						name: "isPublic",
						presentable: false,
						required: false,
						system: false,
						type: "bool"
					},
					{
						hidden: false,
						id: "sr4qlecs",
						name: "isPublished",
						presentable: false,
						required: false,
						system: false,
						type: "bool"
					},
					{
						hidden: false,
						id: "zrnhgsqt",
						name: "isSendToNewsletter",
						presentable: false,
						required: false,
						system: false,
						type: "bool"
					},
					{
						hidden: false,
						id: "gkpsii7x",
						name: "isRecurrent",
						presentable: false,
						required: false,
						system: false,
						type: "bool"
					},
					{
						hidden: false,
						id: "fkmecl7u",
						name: "canceled",
						presentable: false,
						required: false,
						system: false,
						type: "bool"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "avaoqgjf",
						max: 5,
						min: 5,
						name: "time_start",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "xbmlda7k",
						max: 5,
						min: 5,
						name: "time_end",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "4hrvklkx",
						max: 5,
						min: 5,
						name: "start_public",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "sghvtc6z",
						max: 5,
						min: 5,
						name: "start_event",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "yccgokog",
						max: 0,
						min: 0,
						name: "period_proposed",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						hidden: false,
						id: "2eksc1ob",
						maxSize: 2000000,
						name: "dates_proposed",
						presentable: false,
						required: false,
						system: false,
						type: "json"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "yiffyouf",
						max: 0,
						min: 0,
						name: "description",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						exceptDomains: null,
						hidden: false,
						id: "z8q21mfk",
						name: "link",
						onlyDomains: null,
						presentable: false,
						required: false,
						system: false,
						type: "url"
					},
					{
						hidden: false,
						id: "eklnpha5",
						maxSize: 2000000,
						name: "other_date_query",
						presentable: false,
						required: false,
						system: false,
						type: "json"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "2hkkraq2",
						max: 255,
						min: 0,
						name: "age_advice",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						hidden: false,
						id: "gsyw7fux",
						name: "is_age_no_restriction",
						presentable: false,
						required: false,
						system: false,
						type: "bool"
					},
					{
						hidden: false,
						id: "g5i5jfd9",
						name: "is_prix_libre",
						presentable: false,
						required: false,
						system: false,
						type: "bool"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "ef1ib5qm",
						max: 25,
						min: 0,
						name: "prix",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						hidden: false,
						id: "op5q9bz4",
						name: "isMixiteChoisie",
						presentable: false,
						required: false,
						system: false,
						type: "bool"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "dqeszbdn",
						max: 50,
						min: 0,
						name: "mixite",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						convertURLs: false,
						hidden: false,
						id: "2qmpvt6l",
						maxSize: 0,
						name: "desc_public",
						presentable: false,
						required: false,
						system: false,
						type: "editor"
					},
					{
						hidden: false,
						id: "zit8bui8",
						maxSelect: 3,
						maxSize: 5242880,
						mimeTypes: ["image/png", "image/webp", "image/gif", "image/jpeg"],
						name: "image",
						presentable: false,
						protected: false,
						required: false,
						system: false,
						thumbs: null,
						type: "file"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "dpg2ukpg",
						max: 25,
						min: 0,
						name: "duree",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						hidden: false,
						id: "vr5dagod",
						maxSize: 2000000,
						name: "organizers",
						presentable: false,
						required: false,
						system: false,
						type: "json"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "82tuajlv",
						max: 0,
						min: 0,
						name: "reportedTo",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "yjqt8uj6",
						max: 0,
						min: 0,
						name: "reportedFrom",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						hidden: false,
						id: "xay3tmlp",
						maxSize: 2000000,
						name: "rooms",
						presentable: false,
						required: false,
						system: false,
						type: "json"
					},
					{
						hidden: false,
						id: "6x0nbrbm",
						maxSize: 2000000,
						name: "categories",
						presentable: false,
						required: false,
						system: false,
						type: "json"
					},
					{
						hidden: false,
						id: "kpoigs8u",
						maxSize: 2000000,
						name: "recurrence",
						presentable: false,
						required: false,
						system: false,
						type: "json"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "enve4zuz",
						max: 0,
						min: 0,
						name: "recurrentMasterId",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						hidden: false,
						id: "wf7r2fav",
						name: "isRecurrentMaster",
						presentable: false,
						required: false,
						system: false,
						type: "bool"
					},
					{
						hidden: false,
						id: "9ik9jwls",
						maxSize: 2000000,
						name: "reccurenceTeam",
						presentable: false,
						required: false,
						system: false,
						type: "json"
					},
					{
						hidden: false,
						id: "autodate2990389176",
						name: "created",
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: false,
						type: "autodate"
					},
					{
						hidden: false,
						id: "autodate3332085495",
						name: "updated",
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: false,
						type: "autodate"
					}
				],
				id: "y2bmoym46ud46vm",
				indexes: [
					"CREATE INDEX `idx_QRGtE2O` ON `events` (`date_event`)",
					"CREATE INDEX `idx_URB6pU9` ON `events` (`space`)"
				],
				listRule: "",
				name: "events",
				system: false,
				type: "base",
				updateRule: "@request.auth.id != '' ",
				viewRule: ""
			},
			{
				authAlert: {
					emailTemplate: {
						body: "<p>Hello,</p>\n<p>We noticed a login to your {APP_NAME} account from a new location.</p>\n<p>If this was you, you may disregard this email.</p>\n<p><strong>If this wasn't you, you should immediately change your {APP_NAME} account password to revoke access from all other locations.</strong></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>",
						subject: "Login from a new location"
					},
					enabled: true
				},
				authRule: "",
				authToken: {
					duration: 1209600
				},
				confirmEmailChangeTemplate: {
					body: '<p>Hello,</p>\n<p>Click on the button below to confirm your new email address.</p>\n<p>\n  <a class="btn" href="{APP_URL}/_/#/auth/confirm-email-change/{TOKEN}" target="_blank" rel="noopener">Confirm new email</a>\n</p>\n<p><i>If you didn\'t ask to change your email address, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>',
					subject: "Confirm your {APP_NAME} new email address"
				},
				createRule: "",
				deleteRule:
					'@collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.role ?= "admin"',
				emailChangeToken: {
					duration: 1800
				},
				fields: [
					{
						autogeneratePattern: "[a-z0-9]{15}",
						hidden: false,
						id: "text3208210256",
						max: 15,
						min: 15,
						name: "id",
						pattern: "^[a-z0-9]+$",
						presentable: false,
						primaryKey: true,
						required: true,
						system: true,
						type: "text"
					},
					{
						cost: 10,
						hidden: true,
						id: "password901924565",
						max: 0,
						min: 8,
						name: "password",
						pattern: "",
						presentable: false,
						required: true,
						system: true,
						type: "password"
					},
					{
						autogeneratePattern: "[a-zA-Z0-9_]{50}",
						hidden: true,
						id: "text2504183744",
						max: 60,
						min: 30,
						name: "tokenKey",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						exceptDomains: null,
						hidden: false,
						id: "email3885137012",
						name: "email",
						onlyDomains: null,
						presentable: false,
						required: true,
						system: true,
						type: "email"
					},
					{
						hidden: false,
						id: "bool1547992806",
						name: "emailVisibility",
						presentable: false,
						required: false,
						system: true,
						type: "bool"
					},
					{
						hidden: false,
						id: "bool256245529",
						name: "verified",
						presentable: false,
						required: false,
						system: true,
						type: "bool"
					},
					{
						autogeneratePattern: "users[0-9]{6}",
						hidden: false,
						id: "text4166911607",
						max: 150,
						min: 3,
						name: "username",
						pattern: "^[\\w][\\w\\.\\-]*$",
						presentable: false,
						primaryKey: false,
						required: true,
						system: false,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "users_name",
						max: 0,
						min: 0,
						name: "name",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						hidden: false,
						id: "users_avatar",
						maxSelect: 1,
						maxSize: 5242880,
						mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"],
						name: "avatar",
						presentable: false,
						protected: false,
						required: false,
						system: false,
						thumbs: null,
						type: "file"
					},
					{
						hidden: false,
						id: "autodate2990389176",
						name: "created",
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: false,
						type: "autodate"
					},
					{
						hidden: false,
						id: "autodate3332085495",
						name: "updated",
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: false,
						type: "autodate"
					}
				],
				fileToken: {
					duration: 120
				},
				id: "_pb_users_auth_",
				indexes: [
					"CREATE UNIQUE INDEX `__pb_users_auth__username_idx` ON `users` (username COLLATE NOCASE)",
					"CREATE UNIQUE INDEX `__pb_users_auth__email_idx` ON `users` (`email`) WHERE `email` != ''",
					"CREATE UNIQUE INDEX `__pb_users_auth__tokenKey_idx` ON `users` (`tokenKey`)"
				],
				listRule:
					'@request.auth.id = id || @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.role ?= "admin"',
				manageRule: null,
				mfa: {
					duration: 1800,
					enabled: false,
					rule: ""
				},
				name: "users",
				oauth2: {
					enabled: false,
					mappedFields: {
						avatarURL: "",
						id: "",
						name: "",
						username: "username"
					}
				},
				otp: {
					duration: 180,
					emailTemplate: {
						body: "<p>Hello,</p>\n<p>Your one-time password is: <strong>{OTP}</strong></p>\n<p><i>If you didn't ask for the one-time password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>",
						subject: "OTP for {APP_NAME}"
					},
					enabled: false,
					length: 8
				},
				passwordAuth: {
					enabled: true,
					identityFields: ["email", "username"]
				},
				passwordResetToken: {
					duration: 1800
				},
				resetPasswordTemplate: {
					body: '<p>Hello,</p>\n<p>Click on the button below to reset your password.</p>\n<p>\n  <a class="btn" href="{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}" target="_blank" rel="noopener">Reset password</a>\n</p>\n<p><i>If you didn\'t ask to reset your password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>',
					subject: "Reset your {APP_NAME} password"
				},
				system: false,
				type: "auth",
				updateRule:
					'@request.auth.id = id || @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.role ?= "admin"',
				verificationTemplate: {
					body: '<p>Bonjour,</p>\n<p>Vous souhaitez créer un compte sur {APP_NAME}.</p>\n<p>Click on the button below to verify your email address.</p>\n<p>\n  <a class="btn" href="{APP_URL}/_/#/auth/confirm-verification/{TOKEN}" target="_blank" rel="noopener">Verify</a>\n</p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>',
					subject: " {APP_NAME} Vérification de votre email"
				},
				verificationToken: {
					duration: 604800
				},
				viewRule:
					'@request.auth.id = id || @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.role ?= "admin" || @collection.spaceMembers.role ?= "helpers"'
			},
			{
				createRule: "@request.auth.id != '' \n",
				deleteRule: "@request.auth.id != '' ",
				fields: [
					{
						autogeneratePattern: "[a-z0-9]{15}",
						hidden: false,
						id: "text3208210256",
						max: 15,
						min: 15,
						name: "id",
						pattern: "^[a-z0-9]+$",
						presentable: false,
						primaryKey: true,
						required: true,
						system: true,
						type: "text"
					},
					{
						cascadeDelete: false,
						collectionId: "x9nemirbltqou9s",
						hidden: false,
						id: "siwme5j5",
						maxSelect: 1,
						minSelect: 0,
						name: "space",
						presentable: false,
						required: false,
						system: false,
						type: "relation"
					},
					{
						hidden: false,
						id: "ovbjgua6",
						maxSize: 2000000,
						name: "options",
						presentable: false,
						required: false,
						system: false,
						type: "json"
					},
					{
						convertURLs: false,
						hidden: false,
						id: "osypdjq8",
						maxSize: 0,
						name: "mailSend",
						presentable: false,
						required: false,
						system: false,
						type: "editor"
					},
					{
						hidden: false,
						id: "autodate2990389176",
						name: "created",
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: false,
						type: "autodate"
					},
					{
						hidden: false,
						id: "autodate3332085495",
						name: "updated",
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: false,
						type: "autodate"
					}
				],
				id: "nrrz61kk7hwrf00",
				indexes: ["CREATE INDEX `idx_V6FpRVZ` ON `spaces_options` (`space`)"],
				listRule: "@request.auth.id != ''",
				name: "spaces_options",
				system: false,
				type: "base",
				updateRule:
					'@request.auth.id != "" && @collection.spaceMembers.user.id ?= @request.auth.id &&  @collection.spaceMembers.role ?= "admin"\n',
				viewRule: "@request.auth.id != ''"
			},
			{
				createRule: "@request.auth.id != ''",
				deleteRule: "created_by = @request.auth.id",
				fields: [
					{
						autogeneratePattern: "[a-z0-9]{15}",
						hidden: false,
						id: "text3208210256",
						max: 15,
						min: 15,
						name: "id",
						pattern: "^[a-z0-9]+$",
						presentable: false,
						primaryKey: true,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "xbre26ne",
						max: 25,
						min: 0,
						name: "name",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: false,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "ldnkmqx0",
						max: 0,
						min: 0,
						name: "description",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: false,
						type: "text"
					},
					{
						cascadeDelete: false,
						collectionId: "_pb_users_auth_",
						hidden: false,
						id: "hqo57m4o",
						maxSelect: 1,
						minSelect: 0,
						name: "created_by",
						presentable: false,
						required: true,
						system: false,
						type: "relation"
					},
					{
						hidden: false,
						id: "ierq9aft",
						maxSelect: 1,
						name: "inscription",
						presentable: false,
						required: false,
						system: false,
						type: "select",
						values: ["open", "invitation", "close"]
					},
					{
						hidden: false,
						id: "autodate2990389176",
						name: "created",
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: false,
						type: "autodate"
					},
					{
						hidden: false,
						id: "autodate3332085495",
						name: "updated",
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: false,
						type: "autodate"
					}
				],
				id: "x9nemirbltqou9s",
				indexes: [],
				listRule: "@request.auth.id != ''",
				name: "spaces",
				system: false,
				type: "base",
				updateRule: "created_by = @request.auth.id",
				viewRule: "@request.auth.id != ''"
			},
			{
				createRule:
					"@request.auth.id != '' && (user = @request.auth.id || space.created_by = @request.auth.id || (role = 'admin' || role = 'helpers'))",
				deleteRule:
					"@request.auth.id != '' && (user = @request.auth.id || space.created_by = @request.auth.id || role = \"admin\")",
				fields: [
					{
						autogeneratePattern: "[a-z0-9]{15}",
						hidden: false,
						id: "text3208210256",
						max: 15,
						min: 15,
						name: "id",
						pattern: "^[a-z0-9]+$",
						presentable: false,
						primaryKey: true,
						required: true,
						system: true,
						type: "text"
					},
					{
						cascadeDelete: false,
						collectionId: "x9nemirbltqou9s",
						hidden: false,
						id: "hiuzepkk",
						maxSelect: 1,
						minSelect: 0,
						name: "space",
						presentable: false,
						required: true,
						system: false,
						type: "relation"
					},
					{
						cascadeDelete: false,
						collectionId: "_pb_users_auth_",
						hidden: false,
						id: "pm3wbanp",
						maxSelect: 1,
						minSelect: 0,
						name: "user",
						presentable: false,
						required: true,
						system: false,
						type: "relation"
					},
					{
						hidden: false,
						id: "eh8mku8c",
						maxSelect: 1,
						name: "role",
						presentable: false,
						required: true,
						system: false,
						type: "select",
						values: ["admin", "helpers", "invited"]
					},
					{
						hidden: false,
						id: "autodate2990389176",
						name: "created",
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: false,
						type: "autodate"
					},
					{
						hidden: false,
						id: "autodate3332085495",
						name: "updated",
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: false,
						type: "autodate"
					}
				],
				id: "8xwnoxb0ap9cwzh",
				indexes: [],
				listRule: '@request.auth.id != ""',
				name: "spaceMembers",
				system: false,
				type: "base",
				updateRule:
					"@request.auth.id != '' && (user = @request.auth.id || space.created_by = @request.auth.id || role = \"admin\")",
				viewRule: "@request.auth.id != ''"
			},
			{
				authAlert: {
					emailTemplate: {
						body: "<p>Hello,</p>\n<p>We noticed a login to your {APP_NAME} account from a new location.</p>\n<p>If this was you, you may disregard this email.</p>\n<p><strong>If this wasn't you, you should immediately change your {APP_NAME} account password to revoke access from all other locations.</strong></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>",
						subject: "Login from a new location"
					},
					enabled: true
				},
				authRule: "",
				authToken: {
					duration: 1209600
				},
				confirmEmailChangeTemplate: {
					body: '<p>Hello,</p>\n<p>Click on the button below to confirm your new email address.</p>\n<p>\n  <a class="btn" href="{APP_URL}/_/#/auth/confirm-email-change/{TOKEN}" target="_blank" rel="noopener">Confirm new email</a>\n</p>\n<p><i>If you didn\'t ask to change your email address, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>',
					subject: "Confirm your {APP_NAME} new email address"
				},
				createRule: null,
				deleteRule: null,
				emailChangeToken: {
					duration: 1800
				},
				fields: [
					{
						autogeneratePattern: "[a-z0-9]{15}",
						hidden: false,
						id: "text3208210256",
						max: 15,
						min: 15,
						name: "id",
						pattern: "^[a-z0-9]+$",
						presentable: false,
						primaryKey: true,
						required: true,
						system: true,
						type: "text"
					},
					{
						cost: 0,
						hidden: true,
						id: "password901924565",
						max: 0,
						min: 8,
						name: "password",
						pattern: "",
						presentable: false,
						required: true,
						system: true,
						type: "password"
					},
					{
						autogeneratePattern: "[a-zA-Z0-9]{50}",
						hidden: true,
						id: "text2504183744",
						max: 60,
						min: 30,
						name: "tokenKey",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						exceptDomains: null,
						hidden: false,
						id: "email3885137012",
						name: "email",
						onlyDomains: null,
						presentable: false,
						required: true,
						system: true,
						type: "email"
					},
					{
						hidden: false,
						id: "bool1547992806",
						name: "emailVisibility",
						presentable: false,
						required: false,
						system: true,
						type: "bool"
					},
					{
						hidden: false,
						id: "bool256245529",
						name: "verified",
						presentable: false,
						required: false,
						system: true,
						type: "bool"
					},
					{
						hidden: false,
						id: "autodate2990389176",
						name: "created",
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: true,
						type: "autodate"
					},
					{
						hidden: false,
						id: "autodate3332085495",
						name: "updated",
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: true,
						type: "autodate"
					}
				],
				fileToken: {
					duration: 120
				},
				id: "pbc_3142635823",
				indexes: [
					"CREATE UNIQUE INDEX `idx_tokenKey_pbc_3142635823` ON `_superusers` (`tokenKey`)",
					"CREATE UNIQUE INDEX `idx_email_pbc_3142635823` ON `_superusers` (`email`) WHERE `email` != ''"
				],
				listRule: null,
				manageRule: null,
				mfa: {
					duration: 1800,
					enabled: false,
					rule: ""
				},
				name: "_superusers",
				oauth2: {
					enabled: false,
					mappedFields: {
						avatarURL: "",
						id: "",
						name: "",
						username: ""
					}
				},
				otp: {
					duration: 180,
					emailTemplate: {
						body: "<p>Hello,</p>\n<p>Your one-time password is: <strong>{OTP}</strong></p>\n<p><i>If you didn't ask for the one-time password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>",
						subject: "OTP for {APP_NAME}"
					},
					enabled: false,
					length: 8
				},
				passwordAuth: {
					enabled: true,
					identityFields: ["email"]
				},
				passwordResetToken: {
					duration: 1800
				},
				resetPasswordTemplate: {
					body: '<p>Hello,</p>\n<p>Click on the button below to reset your password.</p>\n<p>\n  <a class="btn" href="{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}" target="_blank" rel="noopener">Reset password</a>\n</p>\n<p><i>If you didn\'t ask to reset your password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>',
					subject: "Reset your {APP_NAME} password"
				},
				system: true,
				type: "auth",
				updateRule: null,
				verificationTemplate: {
					body: '<p>Hello,</p>\n<p>Thank you for joining us at {APP_NAME}.</p>\n<p>Click on the button below to verify your email address.</p>\n<p>\n  <a class="btn" href="{APP_URL}/_/#/auth/confirm-verification/{TOKEN}" target="_blank" rel="noopener">Verify</a>\n</p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>',
					subject: "Verify your {APP_NAME} email"
				},
				verificationToken: {
					duration: 259200
				},
				viewRule: null
			},
			{
				createRule: null,
				deleteRule:
					"@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId",
				fields: [
					{
						autogeneratePattern: "[a-z0-9]{15}",
						hidden: false,
						id: "text3208210256",
						max: 15,
						min: 15,
						name: "id",
						pattern: "^[a-z0-9]+$",
						presentable: false,
						primaryKey: true,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "text455797646",
						max: 0,
						min: 0,
						name: "collectionRef",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "text127846527",
						max: 0,
						min: 0,
						name: "recordRef",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "text2462348188",
						max: 0,
						min: 0,
						name: "provider",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "text1044722854",
						max: 0,
						min: 0,
						name: "providerId",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						hidden: false,
						id: "autodate2990389176",
						name: "created",
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: true,
						type: "autodate"
					},
					{
						hidden: false,
						id: "autodate3332085495",
						name: "updated",
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: true,
						type: "autodate"
					}
				],
				id: "pbc_2281828961",
				indexes: [
					"CREATE UNIQUE INDEX `idx_externalAuths_record_provider` ON `_externalAuths` (collectionRef, recordRef, provider)",
					"CREATE UNIQUE INDEX `idx_externalAuths_collection_provider` ON `_externalAuths` (collectionRef, provider, providerId)"
				],
				listRule:
					"@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId",
				name: "_externalAuths",
				system: true,
				type: "base",
				updateRule: null,
				viewRule:
					"@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId"
			},
			{
				createRule: null,
				deleteRule: null,
				fields: [
					{
						autogeneratePattern: "[a-z0-9]{15}",
						hidden: false,
						id: "text3208210256",
						max: 15,
						min: 15,
						name: "id",
						pattern: "^[a-z0-9]+$",
						presentable: false,
						primaryKey: true,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "text455797646",
						max: 0,
						min: 0,
						name: "collectionRef",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "text127846527",
						max: 0,
						min: 0,
						name: "recordRef",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "text1582905952",
						max: 0,
						min: 0,
						name: "method",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						hidden: false,
						id: "autodate2990389176",
						name: "created",
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: true,
						type: "autodate"
					},
					{
						hidden: false,
						id: "autodate3332085495",
						name: "updated",
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: true,
						type: "autodate"
					}
				],
				id: "pbc_2279338944",
				indexes: [
					"CREATE INDEX `idx_mfas_collectionRef_recordRef` ON `_mfas` (collectionRef,recordRef)"
				],
				listRule:
					"@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId",
				name: "_mfas",
				system: true,
				type: "base",
				updateRule: null,
				viewRule:
					"@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId"
			},
			{
				createRule: null,
				deleteRule: null,
				fields: [
					{
						autogeneratePattern: "[a-z0-9]{15}",
						hidden: false,
						id: "text3208210256",
						max: 15,
						min: 15,
						name: "id",
						pattern: "^[a-z0-9]+$",
						presentable: false,
						primaryKey: true,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "text455797646",
						max: 0,
						min: 0,
						name: "collectionRef",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "text127846527",
						max: 0,
						min: 0,
						name: "recordRef",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						cost: 8,
						hidden: true,
						id: "password901924565",
						max: 0,
						min: 0,
						name: "password",
						pattern: "",
						presentable: false,
						required: true,
						system: true,
						type: "password"
					},
					{
						autogeneratePattern: "",
						hidden: true,
						id: "text3866985172",
						max: 0,
						min: 0,
						name: "sentTo",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: false,
						system: true,
						type: "text"
					},
					{
						hidden: false,
						id: "autodate2990389176",
						name: "created",
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: true,
						type: "autodate"
					},
					{
						hidden: false,
						id: "autodate3332085495",
						name: "updated",
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: true,
						type: "autodate"
					}
				],
				id: "pbc_1638494021",
				indexes: [
					"CREATE INDEX `idx_otps_collectionRef_recordRef` ON `_otps` (collectionRef, recordRef)"
				],
				listRule:
					"@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId",
				name: "_otps",
				system: true,
				type: "base",
				updateRule: null,
				viewRule:
					"@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId"
			},
			{
				createRule: null,
				deleteRule:
					"@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId",
				fields: [
					{
						autogeneratePattern: "[a-z0-9]{15}",
						hidden: false,
						id: "text3208210256",
						max: 15,
						min: 15,
						name: "id",
						pattern: "^[a-z0-9]+$",
						presentable: false,
						primaryKey: true,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "text455797646",
						max: 0,
						min: 0,
						name: "collectionRef",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "text127846527",
						max: 0,
						min: 0,
						name: "recordRef",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						autogeneratePattern: "",
						hidden: false,
						id: "text4228609354",
						max: 0,
						min: 0,
						name: "fingerprint",
						pattern: "",
						presentable: false,
						primaryKey: false,
						required: true,
						system: true,
						type: "text"
					},
					{
						hidden: false,
						id: "autodate2990389176",
						name: "created",
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: true,
						type: "autodate"
					},
					{
						hidden: false,
						id: "autodate3332085495",
						name: "updated",
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: true,
						type: "autodate"
					}
				],
				id: "pbc_4275539003",
				indexes: [
					"CREATE UNIQUE INDEX `idx_authOrigins_unique_pairs` ON `_authOrigins` (collectionRef, recordRef, fingerprint)"
				],
				listRule:
					"@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId",
				name: "_authOrigins",
				system: true,
				type: "base",
				updateRule: null,
				viewRule:
					"@request.auth.id != '' && recordRef = @request.auth.id && collectionRef = @request.auth.collectionId"
			}
		];

		return app.importCollections(snapshot, false);
	},
	(app) => {
		return null;
	}
);

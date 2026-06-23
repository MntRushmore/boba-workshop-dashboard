import NextAuth from "next-auth";

export const authOptions = {
	providers: [
		{
			clientId: process.env.HACKCLUB_CLIENT_ID,
			clientSecret: process.env.HACKCLUB_CLIENT_SECRET,
			id: "hackclub",
			name: "Hack Club",
			type: "oauth",
			authorization: {
				params: { scope: "openid profile name slack_id email" },
			},
			id_token: false,
			wellKnown: "https://auth.hackclub.com/.well-known/openid-configuration",
			token: "https://auth.hackclub.com/oauth/token",
			userinfo: "https://auth.hackclub.com/oauth/userinfo",
			profile(profile) {
				return {
					id: profile.sub,
					name: profile.name,
					email: profile.email,
					slack_id: profile.slack_id,
				};
			},
			httpOptions: {
				timeout: 10000,
			},
		},
	],
	callbacks: {
		async jwt({ token, account }) {
			if (account?.access_token) {
				try {
					const authRes = await fetch("https://auth.hackclub.com/api/v1/me", {
						headers: {
							Authorization: `Bearer ${account.access_token}`,
							Accept: "application/json",
						},
					});

					if (!authRes.ok) {
						console.error(
							"Failed to fetch /api/v1/me:",
							authRes.status,
							authRes.statusText,
						);
						return token;
					}

					const authData = await authRes.json();
					const identity = authData.identity || authData;

					const cachetRes = await fetch(
						`https://cachet.dunkirk.sh/users/${identity.slack_id}`,
						{
							headers: {
								Authorization: `Bearer ${account.access_token}`,
								Accept: "application/json",
							},
						},
					);

					const cachetData = await cachetRes.json(); // Doesnt need to pass sicne we have fallbacks

					token.id = identity.id || identity.sub || token.id;
					token.name =
						cachetData.displayName ||
						`${identity.first_name} ${identity.last_name || ""}`;
					token.email = identity.email || token.email;
					token.slack_id = identity.slack_id || null;
					token.image =
						cachetData.imageUrl ||
						`https://cachet.hackclub.com/users/${token.slack_id || token.id}/r`;
				} catch (err) {
					console.error("Error calling /api/v1/me", err);
				}
			}

			return token;
		},

		async session({ session, token }) {
			session.user = {
				id: token.id,
				name: token.name,
				email: token.email,
				slack_id: token.slack_id,
				image: token.image,
			};

			return session;
		},
	},
};

export default NextAuth(authOptions);

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
        params: { scope: "openid profile name slack_id" },
      },
      id_token: false,
      wellKnown: "https://auth.hackclub.com/.well-known/openid-configuration",
      token: "https://auth.hackclub.com/oauth/token",
      userinfo: "https://auth.hackclub.com/oauth/userinfo",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.profile?.name,
          email: profile.email || profile.profile?.email,
          slack_id: profile.slack_id || null,
        };
      },
      httpOptions: {
        timeout: 10000,
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (profile?.slack_id) {
        token.SlackID = profile.slack_id;
      }
      if (account?.access_token) {
        try {
          const res = await fetch("https://auth.hackclub.com/api/v1/me", {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              Accept: "application/json",
            },
          });

          if (!res.ok) {
            console.error(
              "Failed to fetch /api/v1/me:",
              res.status,
              res.statusText,
            );
            return token;
          }

          const data = await res.json();
          const identity = data.identity || data;

          token.id = identity.id || identity.sub || token.id;
          token.name = identity.first_name + " " + (identity.last_name || "");
          token.email = identity.email || token.email;
          token.SlackID = identity.slack_id || token.SlackID || null;
        } catch (err) {
          console.error("Error calling /api/v1/me", err);
          return token;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user = {
        id: token.id,
        name: token.name,
        email: token.email,
        SlackID: token.SlackID,
      };
      return session;
    },
  },
};

export default NextAuth(authOptions);

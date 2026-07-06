import NextAuth from "next-auth";

const providers = [];

providers.push({
  clientId: process.env.HACKCLUB_CLIENT_ID,
  clientSecret: process.env.HACKCLUB_CLIENT_SECRET,
  id: "hackclub",
  name: "Hack Club",
  type: "oauth",
  authorization: {
    params: { scope: "openid email profile name slack_id" },
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
    };
  },
  httpOptions: { timeout: 10000 },
});

export const authOptions = {
  providers,
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        try {
          const res = await fetch("https://auth.hackclub.com/api/v1/me", {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              Accept: "application/json",
            },
          });

          if (!res.ok) {
            const body = await res.text().catch(() => "");
            console.error("Failed to fetch /api/v1/me:", res.status, res.statusText, body);
            return token;
          }

          const data = await res.json();
          const identity = data.identity || data;

          if (!identity.email && !token.email) {
            console.error("/api/v1/me returned no email for identity id:", identity.id || identity.sub);
          }

          token.id = identity.id || identity.sub || token.id;
          token.name = [identity.first_name, identity.last_name].filter(Boolean).join(" ") || token.name;
          token.email = identity.email || token.email;
          token.SlackID = identity.slack_id || null;
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
        SlackID: token.SlackID,
      };
      return session;
    },
  },
};

export default NextAuth(authOptions);

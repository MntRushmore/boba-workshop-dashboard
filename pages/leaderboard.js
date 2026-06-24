import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Box, Button, Card, Flex, Heading, Text, Badge } from "theme-ui";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Layout from "../components/Layout";
import BobaBackground from "../components/BobaBackground";

export default function LeaderboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/leaderboard")
        .then(async (res) => {
          if (!res.ok) throw new Error((await res.json()).error || "Failed");
          return res.json();
        })
        .then(setData)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <Layout>
        <BobaBackground />
        <Flex sx={{ justifyContent: "center", py: 6 }}>
          <Text sx={{ color: "muted" }}>Loading leaderboard... pending</Text>
        </Flex>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <BobaBackground />
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Text sx={{ color: "red" }}>Error: {error}</Text>
          <Button
            onClick={() => window.location.reload()}
            sx={{ mt: 3 }}
            variant="primary"
          >
            Retry
          </Button>
        </Box>
      </Layout>
    );
  }

  const topThree = data?.clubs?.slice(0, 3) || [];
  const rest = data?.clubs?.slice(3) || [];

  return (
    <Layout>
      <Head>
        <title>Leaderboard | Boba Workshop Dashboard</title>
      </Head>
      <BobaBackground />

      <Box sx={{ position: "relative", zIndex: 1, px: [2, 3, 4], pb: 5 }}>
        <Heading
          as="h1"
          sx={{
            fontSize: [5, 6],
            textAlign: "center",
            mb: 3,
            color: "primary",
          }}
        >
          🏆 Community Leaderboard
        </Heading>
        <Text
          as="p"
          sx={{
            textAlign: "center",
            color: "muted",
            maxWidth: 600,
            mx: "auto",
            mb: 4,
          }}
        >
          See which clubs are shipping the most websites and earning boba
          badges.
        </Text>

        <Flex
          sx={{
            justifyContent: "center",
            gap: 3,
            flexWrap: "wrap",
            mb: 4,
          }}
        >
          <StatCard label="Total Submissions" value={data?.totalSubmissions} />
          <StatCard label="Clubs Participating" value={data?.totalClubs} />
        </Flex>

        {topThree.length > 0 && (
          <Flex
            sx={{
              justifyContent: "center",
              gap: 3,
              flexWrap: ["wrap", "nowrap"],
              mb: 4,
            }}
          >
            {topThree.map((club, idx) => (
              <Card
                key={club.name}
                sx={{
                  bg: idx === 0 ? "rgba(236, 55, 80, 0.12)" : "background",
                  border: "2px solid",
                  borderColor: idx === 0 ? "primary" : "rgba(255,255,255,0.08)",
                  borderRadius: 20,
                  p: 4,
                  minWidth: 220,
                  textAlign: "center",
                  flex: 1,
                }}
              >
                <Text sx={{ fontSize: 4, mb: 2 }}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                </Text>
                <Heading as="h3" sx={{ fontSize: 3, mb: 2, color: "text" }}>
                  {club.name}
                </Heading>
                <Text sx={{ color: "muted", fontSize: 1 }}>
                  {club.approved} approved
                </Text>
                <Text sx={{ color: "muted", fontSize: 1 }}>
                  {club.total} total · {club.approvalRate}%
                </Text>
                <Box sx={{ mt: 2 }}>
                  {club.badges.slice(0, 1).map((b) => (
                    <Badge
                      key={b.name}
                      sx={{
                        bg: "primary",
                        color: "white",
                        borderRadius: 999,
                        px: 2,
                        py: 1,
                      }}
                    >
                      {b.icon} {b.name}
                    </Badge>
                  ))}
                </Box>
              </Card>
            ))}
          </Flex>
        )}

        {data?.weeklyTimeline?.length > 0 && (
          <Card
            sx={{
              bg: "background",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              p: [3, 4],
              mb: 4,
            }}
          >
            <Heading as="h2" sx={{ fontSize: 3, mb: 3, color: "text" }}>
              Submissions Over Time
            </Heading>
            <Box sx={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.weeklyTimeline}>
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="period"
                    stroke="rgba(248,251,255,0.5)"
                    tick={{ fill: "rgba(248,251,255,0.6)", fontSize: 12 }}
                  />
                  <YAxis
                    stroke="rgba(248,251,255,0.5)"
                    tick={{ fill: "rgba(248,251,255,0.6)", fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0a0f1c",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      color: "#f8fbff",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#ec3750"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#ec3750" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        )}

        <Card
          sx={{
            bg: "background",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: 3, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <Heading as="h2" sx={{ fontSize: 3, color: "text" }}>
              Club Rankings
            </Heading>
          </Box>
          <Box as="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box as="thead">
              <Box as="tr" sx={{ bg: "rgba(255,255,255,0.05)" }}>
                <HeaderCell>#</HeaderCell>
                <HeaderCell>Club</HeaderCell>
                <HeaderCell>Approved</HeaderCell>
                <HeaderCell>Total</HeaderCell>
                <HeaderCell>Rate</HeaderCell>
                <HeaderCell>Badges</HeaderCell>
              </Box>
            </Box>
            <Box as="tbody">
              {topThree.concat(rest).map((club, idx) => (
                <Box
                  as="tr"
                  key={club.name}
                  sx={{
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    "&:hover": { bg: "rgba(255,255,255,0.03)" },
                  }}
                >
                  <DataCell>{idx + 1}</DataCell>
                  <DataCell>{club.name}</DataCell>
                  <DataCell>{club.approved}</DataCell>
                  <DataCell>{club.total}</DataCell>
                  <DataCell>{club.approvalRate}%</DataCell>
                  <DataCell>
                    <Flex sx={{ gap: 1, flexWrap: "wrap" }}>
                      {club.badges.map((b) => (
                        <Badge
                          key={b.name}
                          sx={{
                            bg: "rgba(255,255,255,0.08)",
                            color: "text",
                            borderRadius: 999,
                            px: 1,
                            py: "2px",
                            fontSize: 0,
                          }}
                          title={b.name}
                        >
                          {b.icon}
                        </Badge>
                      ))}
                    </Flex>
                  </DataCell>
                </Box>
              ))}
            </Box>
          </Box>
        </Card>

        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Text sx={{ color: "muted", fontSize: 1 }}>
            Badges: 🧋 5 approved · 🏆 10 · 👑 25 · 🌟 50
          </Text>
        </Box>
      </Box>
    </Layout>
  );
}

function StatCard({ label, value }) {
  return (
    <Card
      sx={{
        bg: "background",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        p: 3,
        minWidth: 140,
        textAlign: "center",
      }}
    >
      <Heading as="h3" sx={{ fontSize: 4, color: "primary", mb: 1 }}>
        {value ?? "—"}
      </Heading>
      <Text sx={{ color: "muted", fontSize: 1 }}>{label}</Text>
    </Card>
  );
}

function HeaderCell({ children }) {
  return (
    <Box
      as="th"
      sx={{
        textAlign: "left",
        p: 3,
        color: "muted",
        fontSize: 1,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </Box>
  );
}

function DataCell({ children }) {
  return (
    <Box
      as="td"
      sx={{
        p: 3,
        color: "text",
        fontSize: 1,
      }}
    >
      {children}
    </Box>
  );
}

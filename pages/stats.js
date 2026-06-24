import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Box, Button, Card, Flex, Heading, Text, Badge } from "theme-ui";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import Layout from "../components/Layout";
import BobaBackground from "../components/BobaBackground";

const STATUS_COLORS = {
  Approved: "#33d6a6",
  Rejected: "#ec3750",
  Pending: "#f7b801",
};

export default function StatsPage() {
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
      fetch("/api/stats/personal")
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
          <Text sx={{ color: "muted" }}>Loading your stats...</Text>
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
          <Button onClick={() => window.location.reload()} sx={{ mt: 3 }}>
            Retry
          </Button>
        </Box>
      </Layout>
    );
  }

  const summary = data?.summary || {
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    approvalRate: 0,
  };

  const statusData = [
    { name: "Approved", value: summary.approved },
    { name: "Rejected", value: summary.rejected },
    { name: "Pending", value: summary.pending },
  ].filter((d) => d.value > 0);

  const comparison = data?.globalComparison;

  return (
    <Layout>
      <Head>
        <title>My Stats | Boba Workshop Dashboard</title>
      </Head>
      <BobaBackground />

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          px: [2, 3, 4],
          pb: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Heading
          as="h1"
          sx={{
            fontSize: [5, 6],
            textAlign: "center",
            mb: 3,
            color: "text",
          }}
        >
          📊 Your Workshop Stats
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
          Track your club&apos;s submissions, approval rate, and how you stack
          up against the community.
        </Text>

        <Flex
          sx={{
            justifyContent: "center",
            gap: 3,
            flexWrap: "wrap",
            mb: 4,
          }}
        >
          <StatCard label="Total Submissions" value={summary.total} />
          <StatCard label="Approved" value={summary.approved} />
          <StatCard label="Approval Rate" value={`${summary.approvalRate}%`} />
          <StatCard
            label="Community Share"
            value={comparison ? `${comparison.userShare}%` : "—"}
          />
        </Flex>

        {summary.total === 0 && (
          <Card
            sx={{
              bg: "background",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              p: 4,
              textAlign: "center",
              maxWidth: 600,
              mx: "auto",
            }}
          >
            <Text sx={{ color: "muted" }}>
              No submissions found for your clubs yet. Start running workshops
              and submitting websites to see your stats!
            </Text>
          </Card>
        )}

        {data?.clubs?.length > 0 && (
          <Flex
            sx={{ justifyContent: "center", gap: 2, flexWrap: "wrap", mb: 4 }}
          >
            {data.clubs.map((club) => (
              <Badge
                key={club.name}
                sx={{
                  bg: "rgba(255,255,255,0.08)",
                  color: "text",
                  borderRadius: 999,
                  px: 3,
                  py: 1,
                  fontSize: 1,
                }}
              >
                {club.name}
              </Badge>
            ))}
          </Flex>
        )}

        {summary.total > 0 && (
          <>
            <Flex
              sx={{
                gap: 3,
                flexWrap: ["wrap", "nowrap"],
                mb: 4,
              }}
            >
              <Card
                sx={{
                  flex: 1,
                  minWidth: 280,
                  bg: "background",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 20,
                  p: [3, 4],
                }}
              >
                <Heading as="h2" sx={{ fontSize: 3, mb: 3, color: "text" }}>
                  Submission Status
                </Heading>
                <Box sx={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {statusData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={STATUS_COLORS[entry.name]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0f1c",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 12,
                          color: "#f8fbff",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        wrapperStyle={{ color: "rgba(248,251,255,0.7)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Card>

              {comparison && (
                <Card
                  sx={{
                    flex: 1,
                    minWidth: 280,
                    bg: "background",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 20,
                    p: [3, 4],
                  }}
                >
                  <Heading as="h2" sx={{ fontSize: 3, mb: 3, color: "text" }}>
                    You vs Community
                  </Heading>
                  <Box sx={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: "Submissions",
                            You: summary.total,
                            Community: comparison.total - summary.total,
                          },
                          {
                            name: "Approved",
                            You: summary.approved,
                            Community: comparison.approved - summary.approved,
                          },
                        ]}
                      >
                        <CartesianGrid
                          stroke="rgba(255,255,255,0.08)"
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="name"
                          stroke="rgba(248,251,255,0.5)"
                          tick={{
                            fill: "rgba(248,251,255,0.6)",
                            fontSize: 12,
                          }}
                        />
                        <YAxis
                          stroke="rgba(248,251,255,0.5)"
                          tick={{
                            fill: "rgba(248,251,255,0.6)",
                            fontSize: 12,
                          }}
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
                        <Legend
                          wrapperStyle={{ color: "rgba(248,251,255,0.7)" }}
                        />
                        <Bar
                          dataKey="You"
                          fill="#ec3750"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="Community"
                          fill="rgba(255,255,255,0.25)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Card>
              )}
            </Flex>

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
                  Your Submissions Over Time
                </Heading>
                <Box sx={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weeklyTimeline}>
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="period"
                        stroke="rgba(248,251,255,0.5)"
                        tick={{
                          fill: "rgba(248,251,255,0.6)",
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        stroke="rgba(248,251,255,0.5)"
                        tick={{
                          fill: "rgba(248,251,255,0.6)",
                          fontSize: 12,
                        }}
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
                      <Bar
                        dataKey="count"
                        fill="#ec3750"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            )}

            {data?.rejectionReasons?.length > 0 && (
              <Card
                sx={{
                  bg: "background",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 20,
                  p: [3, 4],
                }}
              >
                <Heading as="h2" sx={{ fontSize: 3, mb: 3, color: "text" }}>
                  Rejection Reasons
                </Heading>
                <Box as="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
                  {data.rejectionReasons.map((r) => (
                    <Flex
                      key={r.reason}
                      as="li"
                      sx={{
                        justifyContent: "space-between",
                        py: 2,
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <Text sx={{ color: "text" }}>{r.reason}</Text>
                      <Badge
                        sx={{
                          bg: "rgba(236,55,80,0.15)",
                          color: "#ff7b8f",
                          borderRadius: 999,
                        }}
                      >
                        {r.count}
                      </Badge>
                    </Flex>
                  ))}
                </Box>
              </Card>
            )}
          </>
        )}
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
        minWidth: 130,
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

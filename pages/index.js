import { Box, Grid, Text, Input, Select, Button } from "theme-ui";
import Layout from "../components/Layout";
import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import WorkshopCard from "../components/workshopCard";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { SkeletonCard } from "../components/Skeleton";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("code");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    // Check if user is admin
    const adminSlackIds =
      process.env.NEXT_PUBLIC_ADMIN_SLACK_IDS?.split(",") || [];
    const userIsAdmin = adminSlackIds.includes(session.user.SlackID);
    setIsAdmin(userIsAdmin);

    const fetchEvents = async () => {
      setLoading(true);
      setError("");
      try {
        let res;
        if (userIsAdmin) {
          res = await fetch(`/api/event-codes/all`);
        } else {
          res = await fetch(
            `/api/event-codes/by-owner?SlackID=${encodeURIComponent(
              session.user.SlackID
            )}`
          );
        }
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.error || `Request failed: ${res.status}`);
        setEvents(json.records || []);
      } catch (err) {
        setError(err?.message || "Failed to load your workshops");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [status, session]);

  const filteredEvents = useMemo(() => {
    let filtered = events.filter((event) => {
      const matchesSearch =
        searchQuery === "" ||
        event.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizerName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort the filt  ered results
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "code") {
        return (a.code || "").localeCompare(b.code || "");
      } else if (sortBy === "status") {
        const statusOrder = { Pending: 1, Approved: 2, Rejected: 3 };
        return (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999);
      }
      return 0;
    });

    return sorted;
  }, [events, searchQuery, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const total = events.length;
    const active = events.filter((e) => e.status === "Active").length;
    const deactivated = events.filter((e) => e.status === "Deactivated").length;
    return { total, active, deactivated };
  }, [events]);

  return (
    <Layout
      sx={{
        px: [3, 4],
        py: 4,
      }}
    >
      <Header
        session={session}
        showProfile={showProfile}
        setShowProfile={setShowProfile}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          paddingX: 4,
        }}
      >
        {status === "loading" && <Text>Loading...</Text>}
        {status === "unauthenticated" && <Text>Redirecting to sign in...</Text>}
        {status === "authenticated" && (
          <>
            {loading && (
              <Grid
                gap={3}
                columns={[1, 2, 3]}
                sx={{ width: "100%", maxWidth: "100%", mx: "auto" }}
              >
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </Grid>
            )}
            {error && !loading && (
              <Box
                sx={{
                  textAlign: "center",
                  py: 4,
                  px: 4,
                }}
              >
                <Text
                  sx={{
                    fontSize: 4,
                    mb: 2,
                  }}
                >
                  ⚠️
                </Text>
                <Text
                  sx={{
                    fontSize: 3,
                    fontWeight: "bold",
                    mb: 2,
                    color: "primary",
                  }}
                >
                  Error Loading Workshops
                </Text>
                <Text
                  sx={{
                    fontSize: 2,
                    color: "rgba(248, 251, 255, 0.6)",
                    mb: 3,
                  }}
                >
                  {error}
                </Text>
                <Button
                  onClick={() => {
                    setError("");
                    setLoading(true);
                    fetch(
                      `/api/event-codes/by-owner?SlackID=${encodeURIComponent(
                        session.user.SlackID
                      )}`
                    )
                      .then((res) => res.json())
                      .then((json) => {
                        if (!json.records) throw new Error("No data returned");
                        setEvents(json.records || []);
                      })
                      .catch((err) => {
                        setError(
                          err?.message || "Failed to load your workshops"
                        );
                      })
                      .finally(() => {
                        setLoading(false);
                      });
                  }}
                  sx={{
                    bg: "primary",
                    color: "white",
                    px: 4,
                    py: 2,
                    borderRadius: 4,
                    fontSize: 2,
                    fontWeight: "bold",
                    cursor: "pointer",
                    border: "none",
                    "&:hover": {
                      opacity: 0.9,
                    },
                  }}
                >
                  Retry
                </Button>
              </Box>
            )}
            {!loading && !error && events.length === 0 && (
              <Box
                sx={{
                  py: 6,
                }}
              >
                <Text
                  sx={{
                    fontSize: 2,
                    color: "rgba(248, 251, 255, 0.4)",
                  }}
                >
                  No workshops yet
                </Text>
              </Box>
            )}
            {!loading && !error && events.length > 0 && (
              <>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    width: "100%",
                    mb: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <Text
                      sx={{
                        fontSize: 1,
                        color: "rgba(248, 251, 255, 0.5)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      Total Workshops
                    </Text>
                    <Text
                      sx={{ fontSize: 6, fontWeight: "bold", color: "text" }}
                    >
                      {stats.total}
                    </Text>
                  </Box>
                  <Box
                    sx={{ width: "1px", bg: "rgba(255,255,255,0.1)", mx: 2 }}
                  />
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <Text
                      sx={{
                        fontSize: 1,
                        color: "#33D6A6",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      Active
                    </Text>
                    <Text
                      sx={{ fontSize: 6, fontWeight: "bold", color: "#33D6A6" }}
                    >
                      {stats.active}
                    </Text>
                  </Box>
                  <Box
                    sx={{ width: "1px", bg: "rgba(255,255,255,0.1)", mx: 2 }}
                  />
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <Text
                      sx={{
                        fontSize: 1,
                        color: "rgba(248, 251, 255, 0.5)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      Deactivated
                    </Text>
                    <Text
                      sx={{
                        fontSize: 6,
                        fontWeight: "bold",
                        color: "rgba(248, 251, 255, 0.5)",
                      }}
                    >
                      {stats.deactivated}
                    </Text>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    width: "100%",
                    flexDirection: ["column", "row"],
                    mb: 4,
                  }}
                >
                  <Input
                    placeholder={
                      isAdmin ? "Search by code or organizer..." : "Search..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                      flex: 1,
                      bg: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: 4,
                      px: 3,
                      py: 2,
                      color: "text",
                      fontSize: 2,
                      "&:focus": {
                        outline: "none",
                        borderColor: "#EC3750",
                      },
                      "&::placeholder": {
                        color: "rgba(248, 251, 255, 0.3)",
                      },
                    }}
                  />
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{
                      bg: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: 4,
                      px: 3,
                      py: 2,
                      color: "text",
                      fontSize: 2,
                      cursor: "pointer",
                      "&:focus": {
                        outline: "none",
                        borderColor: "#EC3750",
                      },
                      minWidth: 120,
                    }}
                  >
                    <option value="All">All</option>
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                  </Select>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    sx={{
                      bg: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: 4,
                      px: 3,
                      py: 2,
                      color: "text",
                      fontSize: 2,
                      cursor: "pointer",
                      "&:focus": {
                        outline: "none",
                        borderColor: "#EC3750",
                      },
                      minWidth: 160,
                    }}
                  >
                    <option value="code">By Code</option>
                    <option value="status">By Status</option>
                  </Select>
                </Box>
              </>
            )}
            {!loading &&
              !error &&
              filteredEvents.length === 0 &&
              events.length > 0 && (
                <Text>No workshops match your filters.</Text>
              )}
            {!loading && !error && filteredEvents.length > 0 && (
              <Grid
                gap={3}
                columns={[1, 2, 3]}
                sx={{
                  width: "100%",
                }}
              >
                {filteredEvents.map((ev) => (
                  <WorkshopCard
                    key={ev.id || ev.code}
                    Eventcode={ev.code}
                    EventStatus={ev.status || "Pending"}
                    OrganizerName={ev.organizerName}
                    showOrganizer={isAdmin}
                  />
                ))}
              </Grid>
            )}
          </>
        )}
      </Box>
      <Footer />
    </Layout>
  );
}

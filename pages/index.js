import { Box, Grid, Text, Input, Select, Button } from "theme-ui";
import Layout from "../components/Layout";
import { useEffect, useState, useMemo, useCallback } from "react";
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
  const [adminStats, setAdminStats] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
    }
  }, [status, router]);

  const fetchEvents = useCallback(async () => {
    if (status !== "authenticated") return;
    const adminSlackIds =
      process.env.NEXT_PUBLIC_ADMIN_SLACK_IDS?.split(",") || [];
    const userIsAdmin = adminSlackIds.includes(session?.user?.SlackID);
    setLoading(true);
    setError("");
    try {
      let res;
      if (userIsAdmin) {
        res = await fetch(`/api/workshops/all`);
      } else {
        const emailToUse = session?.user?.email;
        if (!emailToUse) {
          setError("No email address found on your account. Contact a Boba organizer.");
          setLoading(false);
          return;
        }
        res = await fetch(
          `/api/workshops/by-owner?email=${encodeURIComponent(emailToUse)}`,
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
  }, [status, session]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const adminSlackIds =
      process.env.NEXT_PUBLIC_ADMIN_SLACK_IDS?.split(",") || [];
    const userIsAdmin = adminSlackIds.includes(session.user.SlackID);
    setIsAdmin(userIsAdmin);

    if (userIsAdmin) {
      fetch("/api/admin/stats")
        .then((r) => r.json())
        .then((data) => setAdminStats(data))
        .catch(() => {});
    }

    fetchEvents();
  }, [status, session]);

  const filteredEvents = useMemo(() => {
    let filtered = events.filter((event) => {
      const matchesSearch =
        searchQuery === "" ||
        event.clubName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizerName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort the filt  ered results
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "code") {
        if (!a.clubName && b.clubName) return 1;
        if (a.clubName && !b.clubName) return -1;
        return (a.clubName || "").localeCompare(b.clubName || "");
      } else if (sortBy === "status") {
        const statusOrder = { Active: 1, Deactivated: 2 };
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
            {!isAdmin && (
              <Box
                sx={{
                  mb: 4,
                  px: 3,
                  py: 2,
                  borderRadius: 6,
                  bg: "rgba(255,255,255,0.04)",
                  border: "1px solid",
                  borderColor: "border",
                }}
              >
                <Text sx={{ fontSize: 1, color: "rgba(248,251,255,0.5)" }}>
                  Showing workshops linked to{" "}
                  <Text as="span" sx={{ color: "text", fontWeight: 600 }}>
                    {session.user.email || session.user.name}
                  </Text>
                  . If your workshop is missing, contact a Boba organizer.
                </Text>
              </Box>
            )}
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
                      `/api/workshops/by-owner?email=${encodeURIComponent(
                        session.user.email,
                      )}`,
                    )
                      .then(async (res) => {
                        const json = await res.json();
                        if (!res.ok)
                          throw new Error(json?.error || `Request failed: ${res.status}`);
                        if (!json.records) throw new Error("No data returned");
                        setEvents(json.records || []);
                      })
                      .catch((err) => {
                        setError(
                          err?.message || "Failed to load your workshops",
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
                    <Text sx={{ fontSize: 4, fontWeight: 700, color: "text" }}>
                      {stats.total}
                    </Text>
                    <Text sx={{ fontSize: 1, color: "rgba(248,251,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Total
                    </Text>
                  </Box>
                  <Box sx={{ width: "1px", bg: "border", mx: 2 }} />
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <Text sx={{ fontSize: 4, fontWeight: 700, color: "secondary" }}>
                      {stats.active}
                    </Text>
                    <Text sx={{ fontSize: 1, color: "secondary", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Active
                    </Text>
                  </Box>
                  <Box sx={{ width: "1px", bg: "border", mx: 2 }} />
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <Text sx={{ fontSize: 4, fontWeight: 700, color: "rgba(248,251,255,0.4)" }}>
                      {stats.deactivated}
                    </Text>
                    <Text sx={{ fontSize: 1, color: "rgba(248,251,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Deactivated
                    </Text>
                  </Box>
                </Box>

                {isAdmin && adminStats && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      width: "100%",
                      mb: 4,
                      flexWrap: "wrap",
                      pt: 3,
                      borderTop: "1px solid rgba(255,255,255,0.07)",
                      alignItems: "baseline",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                      <Text sx={{ fontSize: 4, fontWeight: 700, color: "text" }}>
                        {adminStats.totalSubmissions}
                      </Text>
                      <Text sx={{ fontSize: 1, color: "rgba(248,251,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Submissions
                      </Text>
                    </Box>
                    <Box sx={{ width: "1px", bg: "border", mx: 2 }} />
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                      <Text sx={{ fontSize: 4, fontWeight: 700, color: "secondary" }}>
                        {adminStats.approvedSubmissions}
                      </Text>
                      <Text sx={{ fontSize: 1, color: "secondary", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Approved
                      </Text>
                    </Box>
                    <Box sx={{ width: "1px", bg: "border", mx: 2 }} />
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                      <Text sx={{ fontSize: 4, fontWeight: 700, color: "primary" }}>
                        ${adminStats.moneyGivenOut}
                      </Text>
                      <Text sx={{ fontSize: 1, color: "primary", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Given Out
                      </Text>
                    </Box>
                    <Box sx={{ width: "1px", bg: "border", mx: 2 }} />
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                      <Text sx={{ fontSize: 4, fontWeight: 700, color: "accent" }}>
                        {adminStats.schoolsReached}
                      </Text>
                      <Text sx={{ fontSize: 1, color: "accent", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Schools
                      </Text>
                    </Box>
                    <Box
                      sx={{ ml: "auto", display: "flex", alignItems: "center" }}
                    >
                      <button
                        onClick={() => {
                          const params = new URLSearchParams({
                            totalWorkshops: stats.total,
                            activeWorkshops: stats.active,
                            totalSubmissions: adminStats.totalSubmissions,
                            approvedSubmissions: adminStats.approvedSubmissions,
                            moneyGivenOut: adminStats.moneyGivenOut,
                            schoolsReached: adminStats.schoolsReached,
                          });
                          const a = document.createElement("a");
                          a.href = `/api/admin/stats-image?${params}`;
                          a.download = `boba-drops-stats-${new Date().toISOString().slice(0, 10)}.png`;
                          a.click();
                        }}
                        style={{
                          padding: "8px 18px",
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.7)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: "600",
                          fontFamily: "system-ui, sans-serif",
                          cursor: "pointer",
                          letterSpacing: "0.02em",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        Export PNG
                      </button>
                    </Box>
                  </Box>
                )}
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
                      bg: "elevated",
                      border: "1px solid",
                      borderColor: "border",
                      borderRadius: 4,
                      px: 3,
                      py: 2,
                      color: "text",
                      fontSize: 2,
                      "&:focus": {
                        outline: "none",
                        borderColor: "primary",
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
                      bg: "elevated",
                      border: "1px solid",
                      borderColor: "border",
                      borderRadius: 4,
                      px: 3,
                      py: 2,
                      color: "text",
                      fontSize: 2,
                      cursor: "pointer",
                      "&:focus": {
                        outline: "none",
                        borderColor: "primary",
                      },
                      minWidth: 110,
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
                      bg: "elevated",
                      border: "1px solid",
                      borderColor: "border",
                      borderRadius: 4,
                      px: 3,
                      py: 2,
                      color: "text",
                      fontSize: 2,
                      cursor: "pointer",
                      "&:focus": {
                        outline: "none",
                        borderColor: "primary",
                      },
                      minWidth: 130,
                    }}
                  >
                    <option value="code">By Name</option>
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
                    key={ev.id || ev.clubName}
                    ClubName={ev.clubName}
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

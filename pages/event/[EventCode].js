import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import Layout from "../../components/Layout";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Breadcrumb from "../../components/Breadcrumb";
import Toast from "../../components/Toast";
import GrantRequestModal from "../../components/GrantRequestModal";
import { Box, Input, Select, Button, Text } from "theme-ui";
import { SkeletonTable } from "../../components/Skeleton";

export default function Event() {
  const { data: session, status } = useSession();
  const [showProfile, setShowProfile] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [eventStatus, setEventStatus] = useState("Active");
  const [grantRequestCooldown, setGrantRequestCooldown] = useState(null);
  const rowsPerPage = 10;
  const StatusKey = {
    Pending: "yellow",
    Approved: "green",
    Rejected: "red",
  };

  const router = useRouter();

  useEffect(() => {
    if (status === "loading" || !router.isReady) return;
    if (status !== "authenticated") return;

    // Store user info in session storage for grant requests
    if (session?.user?.name) {
      window.sessionStorage.setItem("userName", session.user.name);
    }
    if (session?.user?.email) {
      window.sessionStorage.setItem("userEmail", session.user.email);
    }

    const code = router.query.EventCode;

    // Check grant request cooldown from localStorage
    const cooldownKey = `grant-request-${code}`;
    const storedCooldown = localStorage.getItem(cooldownKey);
    if (storedCooldown) {
      const cooldownTime = new Date(storedCooldown);
      const now = new Date();
      const hoursPassed = (now - cooldownTime) / (1000 * 60 * 60);

      if (hoursPassed < 24) {
        setGrantRequestCooldown(cooldownTime);
      } else {
        // Cooldown expired, remove it
        localStorage.removeItem(cooldownKey);
      }
    }

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/websites/${encodeURIComponent(code)}`);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.error || `Request failed: ${res.status}`);
        setRows(json.records || []);
        setEventStatus(json.eventStatus || "Active");
      } catch (err) {
        console.error("Error fetching event data", err);
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status, router.isReady, router.query.EventCode]);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      router.replace("/signin");
    }
  }, [status, router]);

  const filteredRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      const matchesSearch =
        searchQuery === "" ||
        row.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.website?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    // Reset to page 1 when filters change
    setCurrentPage(1);
    return filtered;
  }, [rows, searchQuery, statusFilter]);

  const approvedCount = useMemo(() => {
    return rows.filter((row) => row.status === "Approved").length;
  }, [rows]);

  const isGrantButtonDisabled = useMemo(() => {
    // Disable if less than 3 approved submissions
    if (approvedCount < 3) return true;

    // Disable if event is deactivated
    if (eventStatus === "Deactivated") return true;

    // Disable if within 24-hour cooldown
    if (grantRequestCooldown) {
      const now = new Date();
      const cooldownTime = new Date(grantRequestCooldown);
      const hoursPassed = (now - cooldownTime) / (1000 * 60 * 60);
      return hoursPassed < 24;
    }

    return false;
  }, [approvedCount, eventStatus, grantRequestCooldown]);

  const getGrantButtonText = () => {
    if (approvedCount < 3) return `Need ${3 - approvedCount} more approved`;
    if (eventStatus === "Deactivated") return "Grant Sent";
    if (grantRequestCooldown) {
      const now = new Date();
      const cooldownTime = new Date(grantRequestCooldown);
      const hoursRemaining = 24 - Math.floor((now - cooldownTime) / (1000 * 60 * 60));
      if (hoursRemaining > 0) {
        return `Requested (${hoursRemaining}h cooldown)`;
      }
    }
    return "Request Grant";
  };

  const handleGrantSuccess = (message, requestedAt) => {
    const cooldownKey = `grant-request-${router.query.EventCode}`;
    localStorage.setItem(cooldownKey, requestedAt);
    setGrantRequestCooldown(new Date(requestedAt));
    setToast({ message, type: "success" });
  };

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

  const exportToCSV = () => {
    try {
      const headers = ["Name", "Email", "Status", "Website", "Decision Reason"];
      const csvContent = [
        headers.join(","),
        ...filteredRows.map((row) =>
          [
            `"${row.name || ""}"`,
            `"${row.email || ""}"`,
            `"${row.status || ""}"`,
            `"${row.website || ""}"`,
            `"${row.decisionReason || ""}"`,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `workshop-${router.query.EventCode}-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToast({
        message: "CSV exported successfully!",
        type: "success",
      });
    } catch (err) {
      setToast({
        message: "Failed to export CSV",
        type: "error",
      });
    }
  };

  if (status === "loading") {
    return null;
  }
  if (status !== "authenticated") {
    return null;
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {showGrantModal && (
        <GrantRequestModal
          eventCode={router.query.EventCode}
          approvedCount={approvedCount}
          onClose={() => setShowGrantModal(false)}
          onSuccess={handleGrantSuccess}
        />
      )}
      <Layout>
      <Header
        session={session}
        showProfile={showProfile}
        setShowProfile={setShowProfile}
      />
      <Box sx={{ px: 4 }}>
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/" },
            { label: `Event ${router.query.EventCode || ""}` },
          ]}
        />
        <Box
          sx={{
            mb: 4,
            pb: 3,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 3,
          }}
        >
          <Box>
            <Text sx={{ fontSize: 1, color: "rgba(248, 251, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.1em", mb: 1 }}>
              Event Code
            </Text>
            <Text sx={{ fontSize: 5, fontWeight: "bold", color: "text" }}>
              {router.query.EventCode}
            </Text>
          </Box>
          <Button
            onClick={() => setShowGrantModal(true)}
            disabled={isGrantButtonDisabled}
            sx={{
              bg: isGrantButtonDisabled ? "rgba(255, 255, 255, 0.05)" : "#33D6A6",
              color: isGrantButtonDisabled ? "rgba(248, 251, 255, 0.3)" : "#000",
              px: 4,
              py: 2,
              borderRadius: 4,
              fontSize: 2,
              fontWeight: "bold",
              cursor: isGrantButtonDisabled ? "not-allowed" : "pointer",
              border: "none",
              whiteSpace: "nowrap",
              "&:hover": {
                opacity: isGrantButtonDisabled ? 1 : 0.9,
              },
            }}
          >
            {getGrantButtonText()}
          </Button>
        </Box>
        {!loading && !error && rows.length > 0 && (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              mb: 4,
              flexDirection: ["column", "row"],
              alignItems: ["stretch", "center"],
            }}
          >
            <Input
              placeholder="Search..."
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
              }}
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </Select>
            <Button
              onClick={exportToCSV}
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
                whiteSpace: "nowrap",
                "&:hover": {
                  opacity: 0.9,
                },
              }}
            >
              Export
            </Button>
          </Box>
        )}
        <Box sx={{ overflowX: "auto" }}>
          {loading ? (
            <SkeletonTable />
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                color: "#f8fbff",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ textAlign: "left", padding: "0 0 12px 0", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(248, 251, 255, 0.4)" }}>
                    Name
                  </th>
                  <th style={{ textAlign: "left", padding: "0 0 12px 0", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(248, 251, 255, 0.4)" }}>
                    Email
                  </th>
                  <th style={{ textAlign: "left", padding: "0 0 12px 0", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(248, 251, 255, 0.4)" }}>
                    Status
                  </th>
                  <th style={{ textAlign: "left", padding: "0 0 12px 0", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(248, 251, 255, 0.4)" }}>
                    Website
                  </th>
                  <th style={{ textAlign: "left", padding: "0 0 12px 0", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(248, 251, 255, 0.4)" }}>
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
              {error && !loading && (
                <tr>
                  <td style={{ padding: "24px 16px" }} colSpan={5}>
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 3,
                      }}
                    >
                      <Text sx={{ fontSize: 3, mb: 2 }}>⚠️</Text>
                      <Text
                        sx={{
                          fontSize: 2,
                          fontWeight: "bold",
                          color: "primary",
                          mb: 2,
                        }}
                      >
                        Error Loading Data
                      </Text>
                      <Text
                        sx={{
                          fontSize: 1,
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
                          const code = router.query.EventCode;
                          fetch(`/api/websites/${encodeURIComponent(code)}`)
                            .then((res) => res.json())
                            .then((json) => {
                              if (!json.records)
                                throw new Error("No data returned");
                              setRows(json.records || []);
                            })
                            .catch((err) => {
                              setError(
                                err?.message || "Failed to load data"
                              );
                            })
                            .finally(() => {
                              setLoading(false);
                            });
                        }}
                        sx={{
                          bg: "primary",
                          color: "white",
                          px: 3,
                          py: 2,
                          borderRadius: 8,
                          fontSize: 1,
                          fontWeight: "bold",
                          cursor: "pointer",
                          border: "none",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            bg: "#ff4961",
                          },
                        }}
                      >
                        Retry
                      </Button>
                    </Box>
                  </td>
                </tr>
              )}
              {!loading && !error && filteredRows.length === 0 && (
                <tr>
                  <td style={{ padding: "12px 16px" }} colSpan={5}>
                    No records found.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                paginatedRows.map((row, idx) => (
                  <tr
                    key={`${row.email}-${idx}`}
                    style={{
                      borderBottom: "1px solid rgba(248, 251, 255, 0.05)",
                    }}
                  >
                    <td style={{ padding: "20px 0", fontSize: "15px", fontWeight: 500 }}>{row.name}</td>
                    <td style={{ padding: "20px 0", color: "rgba(248, 251, 255, 0.5)", fontSize: "14px" }}>{row.email}</td>
                    <td style={{ padding: "20px 0" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "3px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          background:
                            row.status === "Pending"
                              ? "#FFC857"
                              : row.status === "Approved"
                              ? "#33D6A6"
                              : "#EC3750",
                          color: "#000",
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: "20px 0" }}>
                      <a
                        href={row.website}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#EC3750",
                          textDecoration: "none",
                          fontSize: "14px",
                        }}
                      >
                        {row.website}
                      </a>
                    </td>
                    <td style={{ padding: "20px 0", color: "rgba(248, 251, 255, 0.5)", fontSize: "14px", maxWidth: "300px" }}>
                      {row.decisionReason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Box>
        {!loading && !error && totalPages > 1 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 4,
            }}
          >
            <Button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              sx={{
                bg: currentPage === 1 ? "transparent" : "primary",
                color: currentPage === 1 ? "rgba(248, 251, 255, 0.3)" : "white",
                px: 3,
                py: 2,
                borderRadius: 4,
                fontSize: 2,
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                border: "none",
                "&:hover": {
                  opacity: currentPage === 1 ? 1 : 0.9,
                },
              }}
            >
              ← Prev
            </Button>
            <Text sx={{ color: "rgba(248, 251, 255, 0.5)", fontSize: 1 }}>
              {currentPage} / {totalPages}
            </Text>
            <Button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              sx={{
                bg: currentPage === totalPages ? "transparent" : "primary",
                color: currentPage === totalPages ? "rgba(248, 251, 255, 0.3)" : "white",
                px: 3,
                py: 2,
                borderRadius: 4,
                fontSize: 2,
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                border: "none",
                "&:hover": {
                  opacity: currentPage === totalPages ? 1 : 0.9,
                },
              }}
            >
              Next →
            </Button>
          </Box>
        )}
      </Box>
      <Footer />
    </Layout>
    </>
  );
}

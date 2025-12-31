import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import Layout from "../../components/Layout";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { Box } from "theme-ui";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

export default function Event() {
  const { data: session, status } = useSession();
  const [showProfile, setShowProfile] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rawResponse, setRawResponse] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const StatusKey = {
    Pending: "yellow",
    Approved: "green",
    Rejected: "red",
  };
  const normalizeStatus = (value) => (value || "Pending").toLowerCase();

  const emailStatusMap = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const email = row.email || "";
      const statuses = map.get(email) || [];
      statuses.push(normalizeStatus(row.status));
      map.set(email, statuses);
    });
    return map;
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!rows.length) return [];
    return rows.filter((row) => {
      const normalized = normalizeStatus(row.status);
      if (statusFilter === "all") return true;
      if (statusFilter === "rejected") {
        const statuses = emailStatusMap.get(row.email || "") || [normalized];
        const hasApproval = statuses.some((s) => s === "approved");
        return normalized === "rejected" || !hasApproval;
      }
      return normalized === statusFilter;
    });
  }, [rows, statusFilter, emailStatusMap]);
  const router = useRouter();

  useEffect(() => {
    if (status === "loading" || !router.isReady) return;
    if (status !== "authenticated") return;
    const code = router.query.EventCode;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/websites/${encodeURIComponent(code)}`);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.error || `Request failed: ${res.status}`);
        setRawResponse(json.raw ?? json);
        setRows(json.records || []);
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

  if (status === "loading") {
    return null;
  }
  if (status !== "authenticated") {
    return null;
  }
  return (
    <Layout>
      <Header
        session={session}
        showProfile={showProfile}
        setShowProfile={setShowProfile}
      />
      <Box sx={{ px: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexDirection: ["column", "row"],
            gap: 2,
            mb: [3, 3],
          }}
        >
          <p sx={{ color: "muted" }}>
            Event Code: <strong>{router.query.EventCode}</strong>
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label htmlFor="status-filter" style={{ color: "#b8c3d9" }}>
              Status filter:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: "#0f172a",
                color: "#f8fbff",
                border: "1px solid rgba(248, 251, 255, 0.12)",
                borderRadius: "8px",
                padding: "10px 12px",
                minWidth: "180px",
              }}
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected (no approvals)</option>
            </select>
          </div>
        </Box>
        <Box
          as="p"
          sx={{
            mt: [2, 3],
            mb: [3, 4],
            textAlign: "center",
            color: "primary",
            fontSize: [2, 3], // smaller than a title
            fontWeight: 500,
            lineHeight: "heading",
            opacity: 0.85, // makes it feel secondary
          }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Decision Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5}>Loading...</TableCell>
                </TableRow>
              )}
              {error && !loading && (
                <TableRow>
                  <TableCell colSpan={5} style={{ color: "#EC3750" }}>
                    {error}
                  </TableCell>
                </TableRow>
              )}
              {!loading && !error && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    No records match this filter.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                !error &&
                filteredRows.map((row, idx) => (
                  <TableRow key={`${row.email}-${idx}`}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell
                      style={{
                        fontWeight: 600,
                        color: StatusKey[row.status] || "#f8fbff",
                      }}
                    >
                      {row.status || "Pending"}
                    </TableCell>
                    <TableCell>
                      {row.website ? (
                        <a
                          href={row.website}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#5BC0EB" }}
                        >
                          {row.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{row.decisionReason || "—"}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Box>
      </Box>
      <Footer />
    </Layout>
  );
}

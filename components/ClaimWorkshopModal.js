import { Box, Button, Text, Input } from "theme-ui";
import { useState } from "react";

export default function ClaimWorkshopModal({ onClose, onSuccess }) {
  const [eventCode, setEventCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/workshops/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventCode: eventCode.trim(),
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to claim workshop");
      }

      setSuccess(data.message || "Workshop claimed successfully!");
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to claim workshop");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bg: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        p: 3,
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          bg: "background",
          borderRadius: 8,
          p: 4,
          maxWidth: 500,
          width: "100%",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Text sx={{ fontSize: 4, fontWeight: "bold", mb: 1 }}>
          Claim Your Workshop
        </Text>
        <Text sx={{ fontSize: 1, color: "rgba(248, 251, 255, 0.6)", mb: 3 }}>
          Link a workshop to your Slack account so it appears on your dashboard.
        </Text>

        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <Text
              sx={{ fontSize: 1, mb: 2, color: "rgba(248, 251, 255, 0.8)" }}
            >
              Workshop Code
            </Text>
            <Input
              placeholder="e.g. NYC-2024"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              required
              sx={{
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
              }}
            />
          </Box>

          <Box sx={{ mb: 4 }}>
            <Text
              sx={{ fontSize: 1, mb: 2, color: "rgba(248, 251, 255, 0.8)" }}
            >
              Verification Email
            </Text>
            <Input
              type="email"
              placeholder="Enter the email on the workshop record"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{
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
              }}
            />
          </Box>

          {error && (
            <Text sx={{ color: "#EC3750", fontSize: 1, mb: 3 }}>{error}</Text>
          )}
          {success && (
            <Text sx={{ color: "#33D6A6", fontSize: 1, mb: 3 }}>{success}</Text>
          )}

          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button
              type="button"
              onClick={onClose}
              disabled={loading}
              sx={{
                bg: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "text",
                px: 4,
                py: 2,
                borderRadius: 4,
                fontSize: 2,
                cursor: "pointer",
                "&:hover": {
                  bg: "rgba(255, 255, 255, 0.05)",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              sx={{
                bg: "primary",
                color: "white",
                px: 4,
                py: 2,
                borderRadius: 4,
                fontSize: 2,
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                border: "none",
                opacity: loading ? 0.6 : 1,
                "&:hover": {
                  opacity: loading ? 0.6 : 0.9,
                },
              }}
            >
              {loading ? "Claiming..." : "Claim Workshop"}
            </Button>
          </Box>
        </form>
      </Box>
    </Box>
  );
}

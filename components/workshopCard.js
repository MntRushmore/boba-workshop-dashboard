import { Box, Text } from "theme-ui";
import { useRouter } from "next/router";
import { useMemo } from "react";

export default function WorkshopCard(props) {
  const {
    ClubName,
    EventStatus,
    OrganizerName,
    showOrganizer,
    approvedCount = 0,
  } = props;
  const router = useRouter();

  const statusColors = {
    Active: "#33D6A6",
    Approved: "#42d225",
    Pending: "#F7B801",
    Rejected: "#EC3750",
    Deactivated: "rgba(255,255,255,0.1)",
  };

  const handleNavigate = () => {
    const target = `/event/${encodeURIComponent(ClubName || "")}`;
    router.push(target);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleNavigate();
    }
  };

  // Cap visual pearls at 12 so the cup doesn't overflow.
  const pearls = useMemo(
    () => Array.from({ length: Math.min(approvedCount, 12) }),
    [approvedCount],
  );

  // Liquid fill is based on approved count, maxing out at 12.
  const fillPercent = Math.min((approvedCount / 12) * 100, 100);

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: 240,
        width: "100%",
        bg: "rgba(20, 25, 40, 0.55)",
        border: "2px solid",
        borderColor: statusColors[EventStatus] || "rgba(255,255,255,0.1)",
        borderRadius: "24px 24px 32px 32px",
        p: 0,
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "transform 200ms ease, border-color 200ms ease",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        "&:hover": {
          transform: "translateY(-6px)",
          borderColor: statusColors[EventStatus] || "#EC3750",
        },
      }}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View workshop ${ClubName}`}
    >
      {/* Cup lid */}
      <Box
        sx={{
          height: "28px",
          width: "calc(100% + 16px)",
          mx: "-8px",
          mt: "-8px",
          borderRadius: "20px 20px 8px 8px",
          bg: "rgba(255,255,255,0.12)",
          border: "2px solid rgba(255,255,255,0.15)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          zIndex: 3,
        }}
      />

      {/* Straw */}
      <Box
        sx={{
          position: "absolute",
          top: "-28px",
          right: "28px",
          width: "12px",
          height: "72px",
          bg: "linear-gradient(90deg, #d93a52, #ff6b81)",
          borderRadius: "6px",
          transform: "rotate(12deg)",
          zIndex: 2,
          boxShadow: "0 4px 10px rgba(236,55,80,0.35)",
        }}
      />

      {/* Liquid container */}
      <Box
        sx={{
          position: "relative",
          flex: "1 1 auto",
          minHeight: "180px",
          overflow: "hidden",
          borderRadius: "0 0 28px 28px",
          p: 4,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 1,
        }}
      >
        {/* Animated liquid fill */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            width: "200%",
            borderRadius: "50% 50% 0 0",
            bg: "linear-gradient(180deg, rgba(91,192,235,0.55), rgba(51,214,166,0.75))",
            opacity: 0.7,
            animation: `fill-rise 1.2s ease-out forwards, liquid-wave 4s ease-in-out infinite`,
            "--fill-height": `${fillPercent}%`,
            transition: "--fill-height 1.2s ease",
          }}
        />

        {/* Pearls inside the cup */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${fillPercent}%`,
            minHeight: pearls.length ? "24px" : 0,
            display: "flex",
            flexWrap: "wrap",
            alignContent: "flex-end",
            justifyContent: "center",
            gap: "8px",
            p: "14px",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {pearls.map((_, i) => (
            <Box
              key={i}
              sx={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                bg: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.35) 0%, #4a2e1f 60%, #2a1a10 100%)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
                animation: `pearl-bob ${2 + (i % 3) * 0.3}s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </Box>

        {/* Text content */}
        <Box sx={{ position: "relative", zIndex: 2 }}>
          <Text
            sx={{
              fontSize: 4,
              fontWeight: "bold",
              color: "text",
              letterSpacing: "-0.02em",
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
          >
            {ClubName}
          </Text>
          {showOrganizer && OrganizerName && (
            <Text
              sx={{
                fontSize: 1,
                color: "rgba(248, 251, 255, 0.7)",
                mt: 1,
              }}
            >
              by {OrganizerName}
            </Text>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 3,
            position: "relative",
            zIndex: 2,
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              px: 3,
              py: 1,
              bg: statusColors[EventStatus] || "rgba(255,255,255,0.1)",
              color: "#000",
              fontSize: 1,
              fontWeight: "bold",
              borderRadius: 4,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {EventStatus}
          </Box>
          <Text
            sx={{
              fontSize: 1,
              fontWeight: "bold",
              color: "rgba(248, 251, 255, 0.9)",
              textShadow: "0 1px 6px rgba(0,0,0,0.5)",
            }}
          >
            {approvedCount} pearl{approvedCount === 1 ? "" : "s"}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

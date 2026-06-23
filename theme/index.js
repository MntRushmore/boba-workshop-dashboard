import hackClubTheme from "@hackclub/theme";

const theme = {
  ...hackClubTheme,
  config: {
    useColorSchemeMediaQuery: false,
    useLocalStorage: true,
  },
  colors: {
    ...hackClubTheme.colors,
    background: "#030712",
    text: "#F8FBFF",
    primary: "#EC3750",
    secondary: "#33D6A6",
    accent: "#5BC0EB",
    muted: "#111527",
    elevated: "#0A0F1C",
    border: "rgba(248, 251, 255, 0.12)",
    highlight: "#FFC857",
    backdrop:
      "linear-gradient(135deg, rgba(10, 15, 28, 0.9), rgba(22, 27, 45, 0.85))",
  },
  fonts: {
    ...hackClubTheme.fonts,
    heading:
      "'Space Grotesk', 'Phantom Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'Space Grotesk', 'Phantom Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'Space Mono', 'SFMono-Regular', Menlo, monospace",
  },
  radii: {
    ...hackClubTheme.radii,
    soft: 18,
    pill: 999,
  },
  layout: {
    ...hackClubTheme.layout,
    container: {
      maxWidth: "1120px",
      px: [3, 4],
      py: [4, 5],
    },
  },
  cards: {
    translucent: {
      bg: "rgba(255, 255, 255, 0.03)",
      border: "1px solid",
      borderColor: "border",
      boxShadow: "0 30px 70px rgba(0, 0, 0, 0.35)",
      borderRadius: "soft",
      backdropFilter: "blur(24px)",
    },
  },
  buttons: {
    primary: {
      bg: "primary",
      color: "background",
      borderRadius: "pill",
      px: 4,
      py: 2,
      fontWeight: 600,
      cursor: "pointer",
      transition: "transform 150ms ease, box-shadow 150ms ease",
      boxShadow: "0 12px 30px rgba(236, 55, 80, 0.35)",
      ":hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 18px 36px rgba(236, 55, 80, 0.45)",
      },
    },
    secondary: {
      variant: "buttons.primary",
      bg: "transparent",
      color: "text",
      border: "1px solid",
      borderColor: "border",
      boxShadow: "none",
    },
  },
  badges: {
    pill: {
      borderRadius: "pill",
      px: 3,
      py: 1,
      fontSize: 1,
      bg: "rgba(255, 255, 255, 0.08)",
    },
  },
  styles: {
    ...hackClubTheme.styles,
    root: {
      fontFamily:
        "'Space Grotesk', 'Phantom Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      backgroundColor: "background",
      color: "text",
    },
    h1: {
      fontSize: [5, 6],
      lineHeight: 1.1,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontSize: [4, 5],
      lineHeight: 1.2,
    },
    p: {
      color: "rgba(248, 251, 255, 0.78)",
      lineHeight: 1.6,
    },
  },
};

export default theme;

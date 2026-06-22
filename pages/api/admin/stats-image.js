import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { isAdmin } from "../../../lib/workshopAuth";
import satori from "satori";
import sharp from "sharp";
import { readFileSync } from "fs";
import { join } from "path";

// Load a font for satori (it requires at least one)
// Use the system font bundled with satori if available, otherwise skip weight 900 styles
let fontData;
try {
  // Try to load Inter from @fontsource if present
  fontData = readFileSync(
    join(process.cwd(), "node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff")
  );
} catch {
  try {
    fontData = readFileSync(
      join(process.cwd(), "node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff")
    );
  } catch {
    // Fall back to the Geist font bundled with @vercel/og if installed
    try {
      fontData = readFileSync(
        join(process.cwd(), "node_modules/@vercel/og/dist/Geist-Regular.ttf")
      );
    } catch {
      fontData = null;
    }
  }
}

// Boba Drops logo SVG (from boba.hackclub.com) — embedded as a data URI for satori
const LOGO_SVG = `<svg viewBox="0 0 337 154" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M95 86.5C99.9283 93.1536 97.312 95.928 97.312 107.576C97.312 119.224 98.976 126.008 98.976 131.256C98.976 136.376 96.416 139.576 90.016 139.576C84.128 139.576 81.568 136.888 81.056 132.408C80.928 131.256 80.288 131.896 79.904 132.408C77.216 136.632 73.248 140.856 67.616 139.192C57.76 136.376 52 123.32 52 110.904C52 98.616 58.4 88.888 67.36 88.888C74.656 88.888 79.52 99.896 81.952 108.472C82.208 109.496 82.72 110.52 82.72 107.576C82.72 89.912 75 91.028 75 84.5C75 78.612 77.856 78.5 82.72 78.5C87.584 78.5 91.5933 81.9007 95 86.5ZM67.36 116.152C65.952 124.216 73.888 127.416 79.264 125.88C80.8 125.496 81.44 123.96 81.824 121.656C82.208 119.736 81.824 117.432 80.544 116.024C76.064 111.544 68.512 108.728 67.36 116.152Z" fill="#F6D193"/><path d="M135.384 88.888C149.976 88.888 148.824 110.52 136.92 110.776C133.336 110.776 129.496 110.136 126.296 110.648C122.968 111.288 121.688 114.616 121.944 117.688C122.712 123.192 123.608 126.904 123.608 131.256C123.608 136.376 120.92 139.576 114.52 139.576C108.248 139.576 105.56 136.376 105.56 131.256C105.56 126.008 107.224 121.912 107.224 114.232C107.224 104.504 103 104.888 103 98.36C103 92.344 112.216 88.888 117.08 88.888C121.944 88.888 123.608 92.088 123.608 97.208C123.608 99.256 123.352 101.816 122.968 104.376C122.968 104.888 123.224 105.144 123.48 104.504C125.4 99.512 126.808 88.888 135.384 88.888Z" fill="#F6D193"/><path d="M171.317 88.12C185.525 88.12 195.509 99.768 195.509 114.232C195.509 128.696 185.525 140.344 171.317 140.344C156.981 140.344 147.125 128.696 147.125 114.232C147.125 99.768 156.981 88.12 171.317 88.12ZM174.773 129.592C178.357 129.208 179.381 122.04 177.461 113.592C175.669 105.144 171.573 98.488 167.861 98.872C164.149 99.256 163.125 106.424 165.045 115C166.965 123.448 171.061 129.976 174.773 129.592Z" fill="#F6D193"/><path d="M232.429 88.888C241.261 88.888 247.661 98.616 247.661 110.904C247.661 123.32 241.901 136.376 232.045 139.192C225.133 141.24 220.909 136.248 218.221 131.768C217.837 131.256 217.453 131.512 217.453 132.152C217.965 138.296 218.733 140.984 218.733 144.696C218.733 149.816 216.045 153.016 209.645 153.016C203.373 153.016 200.685 149.816 200.685 144.696C200.685 139.448 202.349 132.536 202.349 120.888C202.349 103.352 198.125 104.888 198.125 98.36C198.125 92.344 207.341 88.888 212.205 88.888C217.069 88.888 218.733 92.088 218.733 97.208C218.733 100.92 218.093 103.096 217.581 109.112C217.581 109.88 217.837 110.008 217.965 109.24C220.013 101.176 223.981 88.888 232.429 88.888ZM217.069 121.912C217.069 124.344 218.861 125.24 220.141 125.624C225.389 127.544 233.709 124.6 232.429 116.152C231.021 108.088 222.701 111.928 218.733 117.304C217.965 118.328 217.069 119.352 217.069 121.912Z" fill="#F6D193"/><path d="M279.916 111.032C297.452 117.56 298.092 140.344 269.932 140.344C243.692 140.344 249.58 114.872 262.38 114.872C268.268 114.872 271.212 123.064 275.308 121.784C278.124 120.76 275.564 117.048 270.06 114.488C263.276 111.288 251.884 106.936 251.884 99.64C251.884 92.216 263.148 88.12 273.516 88.12C303.212 88.12 289.772 109.24 282.348 106.424C278.124 104.888 277.356 101.176 274.156 101.176C270.444 101.176 269.932 107.32 279.916 111.032Z" fill="#F6D193"/><path d="M102.304 25.888C111.136 25.888 117.536 35.616 117.536 47.904C117.536 60.32 111.776 73.376 101.92 76.192C96.032 77.984 91.936 73.248 89.248 69.28C88.992 68.896 88.608 68.512 88.48 69.664C87.968 74.016 82.8009 75.0093 78.5 74.5C72.8367 73.8294 69.5 68.12 69.5 63C69.5 57.752 72.224 56.224 72.224 44.576C72.224 26.912 68 28.448 68 21.92C68 16.032 77.216 12.448 82.08 12.448C86.944 12.448 88.608 15.776 88.608 20.768C88.608 26.016 86.816 32.928 86.816 44.576C86.816 47.392 87.456 47.264 87.712 46.24C89.504 37.92 94.112 25.888 102.304 25.888ZM87.712 59.168C87.84 60.448 88.352 61.728 89.632 62.496C94.624 64.928 103.712 61.984 102.304 53.152C100.896 45.088 92.832 49.056 88.736 54.304C87.84 55.584 87.584 57.76 87.712 59.168Z" fill="#F6D193"/><path d="M145.192 25.12C159.4 25.12 169.384 36.768 169.384 51.232C169.384 65.696 159.4 77.344 145.192 77.344C130.856 77.344 121 65.696 121 51.232C121 36.768 130.856 25.12 145.192 25.12ZM148.648 66.592C152.232 66.208 153.256 59.04 151.336 50.592C149.544 42.144 145.448 35.488 141.736 35.872C138.024 36.256 137 43.424 138.92 52C140.84 60.448 144.936 66.976 148.648 66.592Z" fill="#F6D193"/><path d="M204.804 25.888C213.636 25.888 220.036 35.616 220.036 47.904C220.036 60.32 214.276 73.376 204.42 76.192C198.532 77.984 194.436 73.248 191.748 69.28C191.492 68.896 191.108 68.512 190.98 69.664C190.468 74.016 187.908 76.576 182.02 76.576C175.748 76.576 173.06 73.376 173.06 68.256C173.06 63.008 174.724 56.224 174.724 44.576C174.724 26.912 170.5 28.448 170.5 21.92C170.5 16.032 179.716 12.448 184.58 12.448C189.444 12.448 191.108 15.776 191.108 20.768C191.108 26.016 189.316 32.928 189.316 44.576C189.316 47.392 189.956 47.264 190.212 46.24C192.004 37.92 196.612 25.888 204.804 25.888ZM190.212 59.168C190.34 60.448 190.852 61.728 192.132 62.496C197.124 64.928 206.212 61.984 204.804 53.152C203.396 45.088 195.332 49.056 191.236 54.304C190.34 55.584 190.084 57.76 190.212 59.168Z" fill="#F6D193"/><path d="M269.964 34.208C269.964 43.04 266.892 53.664 268.3 57.376C269.58 60.832 273.164 61.856 273.164 66.848C273.164 71.712 267.148 76.576 261.004 76.576C255.244 76.576 252.556 74.016 252.044 69.792C251.916 68.256 251.276 69.664 250.892 70.304C248.076 74.144 244.364 77.728 239.116 76.192C229.26 73.376 223.5 60.32 223.5 47.904C223.5 35.616 229.9 25.888 238.86 25.888C246.156 25.888 250.252 37.28 252.428 45.856C252.684 47.136 253.452 47.008 253.324 45.856C252.812 41.76 252.044 37.792 252.044 34.208C252.044 29.088 254.604 25.888 261.004 25.888C267.404 25.888 269.964 29.088 269.964 34.208ZM238.86 53.152C237.452 61.088 244.748 64.544 249.868 63.008C252.172 62.24 252.556 60.96 253.068 58.784C253.452 56.864 252.94 55.072 251.788 53.792C247.692 48.8 240.14 45.344 238.86 53.152Z" fill="#F6D193"/></svg>`;

const LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;

function statBlock(label, value, color) {
  const labelColor = color === "#ffffff" ? "rgba(255,255,255,0.45)" : color;
  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", gap: "4px" },
      children: [
        {
          type: "div",
          props: {
            style: {
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: labelColor,
            },
            children: label,
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: "72px",
              fontWeight: "700",
              lineHeight: "1",
              color: color,
            },
            children: value,
          },
        },
      ],
    },
  };
}

function divider(vertical = true) {
  return {
    type: "div",
    props: {
      style: vertical
        ? { width: "1px", height: "180px", background: "rgba(255,255,255,0.08)", margin: "0 40px", alignSelf: "center" }
        : { height: "1px", width: "100%", background: "rgba(255,255,255,0.07)", margin: "0" },
    },
  };
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (!isAdmin(session)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const totalWorkshops = Number(req.query.totalWorkshops) || 0;
  const activeWorkshops = Number(req.query.activeWorkshops) || 0;
  const totalSubmissions = Number(req.query.totalSubmissions) || 0;
  const approvedSubmissions = Number(req.query.approvedSubmissions) || 0;
  const moneyGivenOut = Number(req.query.moneyGivenOut) || 0;
  const schoolsReached = Number(req.query.schoolsReached) || 0;

  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const fonts = fontData
    ? [{ name: "Sans", data: fontData, weight: 700, style: "normal" }]
    : [];

  const tree = {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        background: "#0d0f14",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "52px 64px",
        fontFamily: fonts.length ? "Sans" : "sans-serif",
      },
      children: [
        // Header: logo + site
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: "20px" },
            children: [
              {
                type: "img",
                props: {
                  src: LOGO_DATA_URI,
                  width: 168,
                  height: 77,
                  style: { objectFit: "contain" },
                },
              },
              {
                type: "div",
                props: {
                  style: { width: "1px", height: "36px", background: "rgba(255,255,255,0.15)", marginLeft: "4px" },
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", marginLeft: "4px" },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: { fontSize: "12px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase" },
                        children: "boba.hackclub.com",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: { fontSize: "18px", fontWeight: "700", color: "rgba(255,255,255,0.8)", marginTop: "3px" },
                        children: "Workshop Stats",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        // Stats row
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", flex: 1, marginTop: "8px" },
            children: [
              // Left cluster: workshop counts
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", gap: "32px" },
                  children: [
                    statBlock("Total Workshops", totalWorkshops.toLocaleString(), "#ffffff"),
                    statBlock("Active", activeWorkshops.toLocaleString(), "#33D6A6"),
                  ],
                },
              },

              divider(true),

              // Right cluster: impact stats (2x2 grid)
              {
                type: "div",
                props: {
                  style: { display: "flex", flex: 1, flexWrap: "wrap", gap: "32px 48px" },
                  children: [
                    statBlock("Submissions", totalSubmissions.toLocaleString(), "#ffffff"),
                    statBlock("Approved", approvedSubmissions.toLocaleString(), "#33D6A6"),
                    statBlock("Given Out", `$${moneyGivenOut.toLocaleString()}`, "#EC3750"),
                    statBlock("Schools Reached", schoolsReached.toLocaleString(), "#338eda"),
                  ],
                },
              },
            ],
          },
        },

        // Footer
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              paddingTop: "18px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: { fontSize: "12px", color: "rgba(255,255,255,0.22)", letterSpacing: "0.05em" },
                  children: `Generated ${dateStr}`,
                },
              },
              {
                type: "div",
                props: {
                  style: { fontSize: "12px", color: "rgba(255,255,255,0.22)", letterSpacing: "0.05em" },
                  children: "Hack Club Boba Drops",
                },
              },
            ],
          },
        },
      ],
    },
  };

  try {
    const svg = await satori(tree, {
      width: 1200,
      height: 630,
      fonts,
    });

    const png = await sharp(Buffer.from(svg)).png().toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="boba-drops-stats-${new Date().toISOString().slice(0, 10)}.png"`
    );
    res.setHeader("Cache-Control", "no-store");
    res.send(png);
  } catch (err) {
    console.error("stats-image error", err);
    res.status(500).json({ error: err.message });
  }
}

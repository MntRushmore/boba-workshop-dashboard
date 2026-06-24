import { Box, Button, Card, Flex, Heading, Text } from "theme-ui";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function Header({ session, showProfile, setShowProfile }) {
  if (!session) return null;

  return (
    <Flex
      as="header"
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        mb: [3, 4],
        pt: [2, 3],
        flexWrap: "wrap",
        width: "100%",
        gap: [2, 3],
        position: "relative",
        pr: [2, 3, 4],
      }}
    >
      <Heading
        as="h1"
        sx={{
          fontSize: [4, 5],
          textAlign: "center",
          mx: ["auto", "auto", 0],
          flex: 1,
          color: "primary",
        }}
      >
        Boba Workshop Dashboard
      </Heading>
      <Box
        sx={{
          position: "relative",
          ml: [0, "auto"],
          mt: [0, 0],
          alignSelf: ["center", "flex-start"],
        }}
      >
        <Button
          variant="secondary"
          onClick={() => setShowProfile((prev) => !prev)}
          sx={{
            p: 2,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            border: 20,
            boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            bg: "primary",
          }}
          aria-label="Profile menu"
        >
          {session.user?.image ? (
            <Box
              as="img"
              src={session.user.image}
              alt="Profile"
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <Text>
              {session.user?.name
                ? session.user?.name
                    .split(" ")
                    .map((n) => n.charAt(0).toUpperCase())
                    .join("")
                : "U"}
            </Text>
          )}
        </Button>
        <Box
          sx={{
            justifyContent: "center",
            alignItems: "center",
            width: "fit-content",
            height: "100%",
          }}
        >
          {showProfile && (
            <>
              <Box
                onClick={() => setShowProfile(false)}
                sx={{
                  position: "fixed",
                  inset: 0,
                  bg: "rgba(0, 0, 0, 0.35)",
                  backdropFilter: "blur(4px)",
                  zIndex: 5,
                }}
              />
              <Card
                sx={{
                  position: "absolute",
                  top: "52px",
                  right: 0,
                  width: [280, 300],
                  textAlign: "left",
                  boxShadow: "0px 8px 24px rgba(0,0,0,0.25)",
                  zIndex: 10,
                  p: 4,
                  bg: "background",
                  borderRadius: 20,
                  border: "2px solid",
                  borderColor: "primary",
                }}
              >
                <Box
                  sx={{
                    mb: 3,
                    pb: 3,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <Heading
                    as="h3"
                    sx={{ fontSize: 3, mb: 2, color: "primary" }}
                  >
                    {session.user?.name || "Profile"}
                  </Heading>
                  {session.user?.email && (
                    <Text
                      sx={{ fontSize: 1, color: "rgba(248, 251, 255, 0.6)" }}
                    >
                      {session.user.email}
                    </Text>
                  )}
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Link href="/leaderboard" passHref legacyBehavior>
                    <Button
                      as="a"
                      variant="secondary"
                      onClick={() => setShowProfile(false)}
                      sx={{
                        width: "100%",
                        bg: "rgba(255, 255, 255, 0.05)",
                        color: "text",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        textDecoration: "none",
                        "&:hover": {
                          bg: "rgba(255, 255, 255, 0.08)",
                        },
                      }}
                    >
                      🏆 Leaderboard
                    </Button>
                  </Link>
                  <Link href="/stats" passHref legacyBehavior>
                    <Button
                      as="a"
                      variant="secondary"
                      onClick={() => setShowProfile(false)}
                      sx={{
                        width: "100%",
                        bg: "rgba(255, 255, 255, 0.05)",
                        color: "text",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        textDecoration: "none",
                        "&:hover": {
                          bg: "rgba(255, 255, 255, 0.08)",
                        },
                      }}
                    >
                      📊 My Stats
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    onClick={() => setShowProfile(false)}
                    sx={{
                      width: "100%",
                      bg: "rgba(255, 255, 255, 0.05)",
                      color: "text",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      "&:hover": {
                        bg: "rgba(255, 255, 255, 0.08)",
                      },
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setShowProfile(false);
                      signOut();
                    }}
                    sx={{
                      width: "100%",
                      bg: "primary",
                      color: "white",
                      border: "none",
                      "&:hover": {
                        bg: "#ff4961",
                      },
                    }}
                  >
                    Sign Out
                  </Button>
                </Box>
              </Card>
            </>
          )}
        </Box>
      </Box>
    </Flex>
  );
}

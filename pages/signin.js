import { Box, Alert, Button } from "theme-ui";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Login() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
          width: "100vw",
          height: "100vh",
        }}
      >
        <Alert
          variant="warning"
          sx={{
            width: ["80%", "80%", "80%", "80%"],
            maxWidth: "600px",
            border: "2px solid",
            flexDirection: "column",
            alignItems: "left",
            padding: 4,
            textAlign: "center",
            gap: 3,
          }}
        >
          <p>
            Hello there! Please Sign-in to your Hack Club account to see your
            workshops.
          </p>
          <Button
            onClick={() => signIn("hackclub")}
            sx={{
              px: "32px",
              mt: "16px",
              width: "fit-content",
              textAlign: "center",
              background: "highlight",
              cursor: "pointer",
            }}
          >
            Click to Sign In
          </Button>
        </Alert>
      </Box>
    </>
  );
}

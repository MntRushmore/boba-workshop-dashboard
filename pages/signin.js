import { useRouter } from "next/router";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { Alert, Box, Button, Text } from "theme-ui";

export default function Login() {
	const router = useRouter();
	const { data: session } = useSession();

	useEffect(() => {
		if (session) {
			router.push("/");
		}
	}, [session, router]);

	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				flexDirection: "column",
				width: "100vw",
				height: "100vh",
			}}
		>
			<Text as="h1" sx={{ fontSize: 5, mb: 0 }}>
				👋
			</Text>
			<Text as="h1" sx={{ fontSize: 5, mb: 3 }}>
				Hello there!
			</Text>
			<Text
				as="p"
				sx={{
					fontSize: 1,
					mb: 3,
					textAlign: "center",
					maxWidth: 600,
					color: "#c0c0c0",
				}}
			>
				Please Sign-in to your Hack Club account to see your workshops :)
			</Text>
			<Button
				onClick={() => signIn("hackclub")}
				sx={{
					px: "32px",
					mt: "16px",
					width: "fit-content",
					textAlign: "center",
					color: "#ffdede",
				}}
			>
				Click to Sign In
			</Button>
		</Box>
	);
}

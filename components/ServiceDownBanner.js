import { Box, Text } from "theme-ui";

export default function ServiceDownBanner() {
	return (
		<Box
			sx={{
				bg: "#EC3750",
				color: "white",
				py: 3,
				px: 4,
				textAlign: "center",
				width: "100%",
				position: "relative",
				zIndex: 100,
			}}
		>
			<Text sx={{ fontWeight: "bold", fontSize: 2 }}>
				This service is currently down. Please DM{" "}
				<Text
					as="a"
					href="https://hackclub.slack.com/team/U020X4GCWSF"
					target="_blank"
					rel="noopener noreferrer"
					sx={{ color: "white", textDecoration: "underline" }}
				>
					@Rushmore
				</Text>{" "}
				on Slack or email{" "}
				<Text
					as="a"
					href="mailto:boba@hackclub.com"
					sx={{ color: "white", textDecoration: "underline" }}
				>
					boba@hackclub.com
				</Text>{" "}
				to end your workshop!
			</Text>
		</Box>
	);
}

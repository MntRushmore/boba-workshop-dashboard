import { Flex } from "theme-ui";

export default function Footer() {
	return (
		<Flex
			as="footer"
			sx={{
				fontSize: 1,
				py: [3, 4],
				color: "rgba(248, 251, 255, 0.6)",
				justifyContent: "space-between",
				flexWrap: "wrap",
				gap: 3,
			}}
		/>
	);
}

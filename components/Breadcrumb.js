import { useRouter } from "next/router";
import { Box, Text } from "theme-ui";

export default function Breadcrumb({ items }) {
	const router = useRouter();

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 2,
				mb: 3,
				fontSize: 2,
				flexWrap: "wrap",
			}}
		>
			{items.map((item, index) => (
				<Box
					key={index}
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 2,
					}}
				>
					{item.href ? (
						<Text
							type="button"
							onClick={() => router.push(item.href)}
							sx={{
								color: "rgba(248, 251, 255, 0.6)",
								cursor: "pointer",
								transition: "color 0.2s ease",
								"&:hover": {
									color: "primary",
									textDecoration: "underline",
								},
							}}
						>
							{item.label}
						</Text>
					) : (
						<Text
							sx={{
								color: "text",
								fontWeight: "bold",
							}}
						>
							{item.label}
						</Text>
					)}
					{index < items.length - 1 && (
						<Text sx={{ color: "rgba(248, 251, 255, 0.4)" }}>/</Text>
					)}
				</Box>
			))}
		</Box>
	);
}

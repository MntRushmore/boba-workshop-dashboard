import { Box } from "theme-ui";

export function SkeletonCard() {
	return (
		<Box
			sx={{
				minHeight: [100, 160],
				width: "100%",
				maxWidth: "100%",
				borderRadius: 12,
				p: [3, 4],
				boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
				display: "flex",
				alignItems: "flex-end",
				justifyContent: "space-between",
				gap: 3,
				mx: "auto",
				position: "relative",
				overflow: "hidden",
				bg: "rgba(255, 255, 255, 0.03)",
				"&::after": {
					content: "''",
					position: "absolute",
					top: 0,
					left: "-100%",
					width: "100%",
					height: "100%",
					background:
						"linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent)",
					animation: "shimmer 2s infinite",
				},
				"@keyframes shimmer": {
					"0%": { left: "-100%" },
					"100%": { left: "100%" },
				},
			}}
		>
			<Box
				sx={{
					width: [100, 120],
					height: [20, 32],
					bg: "rgba(255, 255, 255, 0.1)",
					borderRadius: 4,
					zIndex: 1,
				}}
			/>
		</Box>
	);
}

export function SkeletonTable() {
	return (
		<Box
			sx={{
				width: "100%",
				borderRadius: 12,
				overflow: "hidden",
				bg: "#0a0f1c",
			}}
		>
			{/* Header */}
			<Box
				sx={{
					display: "flex",
					gap: 3,
					p: 3,
					bg: "rgba(255,255,255,0.06)",
				}}
			>
				{[1, 2, 3, 4, 5].map((i) => (
					<Box
						key={i}
						sx={{
							flex: 1,
							height: 16,
							bg: "rgba(255, 255, 255, 0.1)",
							borderRadius: 4,
						}}
					/>
				))}
			</Box>
			{/* Rows */}
			{[1, 2, 3, 4, 5].map((row) => (
				<Box
					key={row}
					sx={{
						display: "flex",
						gap: 3,
						p: 3,
						borderTop: "1px solid rgba(248, 251, 255, 0.08)",
						bg: row % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
						position: "relative",
						overflow: "hidden",
						"&::after": {
							content: "''",
							position: "absolute",
							top: 0,
							left: "-100%",
							width: "100%",
							height: "100%",
							background:
								"linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)",
							animation: `shimmer 2s infinite ${row * 0.2}s`,
						},
						"@keyframes shimmer": {
							"0%": { left: "-100%" },
							"100%": { left: "100%" },
						},
					}}
				>
					{[1, 2, 3, 4, 5].map((i) => (
						<Box
							key={i}
							sx={{
								flex: 1,
								height: 14,
								bg: "rgba(255, 255, 255, 0.08)",
								borderRadius: 3,
								zIndex: 1,
							}}
						/>
					))}
				</Box>
			))}
		</Box>
	);
}

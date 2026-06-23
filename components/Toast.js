import { useEffect } from "react";
import { Box, Text } from "theme-ui";

export default function Toast({
	message,
	type = "info",
	onClose,
	duration = 3000,
}) {
	useEffect(() => {
		if (duration > 0) {
			const timer = setTimeout(() => {
				onClose();
			}, duration);
			return () => clearTimeout(timer);
		}
	}, [duration, onClose]);

	const typeStyles = {
		success: {
			bg: "rgba(51, 214, 166, 0.15)",
			border: "1px solid rgba(51, 214, 166, 0.4)",
			color: "#33D6A6",
		},
		error: {
			bg: "rgba(236, 55, 80, 0.15)",
			border: "1px solid rgba(236, 55, 80, 0.4)",
			color: "#EC3750",
		},
		info: {
			bg: "rgba(91, 192, 235, 0.15)",
			border: "1px solid rgba(91, 192, 235, 0.4)",
			color: "#5BC0EB",
		},
	};

	const style = typeStyles[type] || typeStyles.info;

	return (
		<Box
			sx={{
				position: "fixed",
				top: 24,
				right: 24,
				zIndex: 9999,
				minWidth: [280, 320],
				maxWidth: [320, 400],
				p: 3,
				borderRadius: 12,
				boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
				backdropFilter: "blur(10px)",
				animation: "slideIn 0.3s ease",
				"@keyframes slideIn": {
					"0%": {
						transform: "translateX(400px)",
						opacity: 0,
					},
					"100%": {
						transform: "translateX(0)",
						opacity: 1,
					},
				},
				...style,
			}}
		>
			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "start",
				}}
			>
				<Text sx={{ fontSize: 2, fontWeight: "bold", flex: 1 }}>{message}</Text>
				<Text
					onClick={onClose}
					sx={{
						cursor: "pointer",
						ml: 2,
						fontSize: 3,
						lineHeight: 1,
						opacity: 0.7,
						transition: "opacity 0.2s ease",
						"&:hover": {
							opacity: 1,
						},
					}}
				>
					×
				</Text>
			</Box>
		</Box>
	);
}

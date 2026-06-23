import { useState } from "react";
import { Box, Button, Input, Select, Text, Textarea } from "theme-ui";

export default function GrantRequestModal({
	clubName,
	approvedCount,
	onClose,
	onSuccess,
}) {
	const [organizerName, setOrganizerName] = useState("");
	const [organizerEmail, setOrganizerEmail] = useState("");
	const [paymentMethod, setPaymentMethod] = useState("Reimbursement");
	const [additionalInfo, setAdditionalInfo] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const totalAmount = approvedCount * 5;

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/grant-request", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					clubName,
					organizerName,
					organizerEmail,
					amount: totalAmount,
					approvedCount,
					paymentMethod,
					additionalInfo,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to submit grant request");
			}

			onSuccess(data.message, data.requestedAt);
			onClose();
		} catch (err) {
			setError(err.message || "Failed to submit grant request");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Box
			sx={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				bg: "rgba(0, 0, 0, 0.8)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000,
				p: 3,
			}}
			onClick={onClose}
		>
			<Box
				sx={{
					bg: "background",
					borderRadius: 8,
					p: 4,
					maxWidth: 500,
					width: "100%",
					border: "1px solid rgba(255, 255, 255, 0.1)",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<Text sx={{ fontSize: 4, fontWeight: "bold", mb: 1 }}>
					Request Grant
				</Text>
				<Text sx={{ fontSize: 1, color: "rgba(248, 251, 255, 0.6)", mb: 3 }}>
					Club: {clubName}
				</Text>

				<Box
					sx={{
						bg: "rgba(51, 214, 166, 0.1)",
						border: "1px solid rgba(51, 214, 166, 0.3)",
						borderRadius: 4,
						p: 3,
						mb: 4,
					}}
				>
					<Text sx={{ fontSize: 1, color: "rgba(248, 251, 255, 0.6)", mb: 1 }}>
						Total Grant Amount
					</Text>
					<Text sx={{ fontSize: 6, fontWeight: "bold", color: "#33D6A6" }}>
						${totalAmount}
					</Text>
					<Text sx={{ fontSize: 1, color: "rgba(248, 251, 255, 0.5)", mt: 1 }}>
						{approvedCount} approved submission{approvedCount !== 1 ? "s" : ""}{" "}
						× $5 each
					</Text>
				</Box>

				<form onSubmit={handleSubmit}>
					<Box sx={{ mb: 3 }}>
						<Text
							sx={{ fontSize: 1, mb: 2, color: "rgba(248, 251, 255, 0.8)" }}
						>
							Your Name
						</Text>
						<Input
							placeholder="Enter your name"
							value={organizerName}
							onChange={(e) => setOrganizerName(e.target.value)}
							required
							sx={{
								bg: "transparent",
								border: "1px solid rgba(255, 255, 255, 0.15)",
								borderRadius: 4,
								px: 3,
								py: 2,
								color: "text",
								fontSize: 2,
								"&:focus": {
									outline: "none",
									borderColor: "#EC3750",
								},
							}}
						/>
					</Box>

					<Box sx={{ mb: 3 }}>
						<Text
							sx={{ fontSize: 1, mb: 2, color: "rgba(248, 251, 255, 0.8)" }}
						>
							Your Email
						</Text>
						<Input
							type="email"
							placeholder="Enter your email"
							value={organizerEmail}
							onChange={(e) => setOrganizerEmail(e.target.value)}
							required
							sx={{
								bg: "transparent",
								border: "1px solid rgba(255, 255, 255, 0.15)",
								borderRadius: 4,
								px: 3,
								py: 2,
								color: "text",
								fontSize: 2,
								"&:focus": {
									outline: "none",
									borderColor: "#EC3750",
								},
							}}
						/>
					</Box>

					<Box sx={{ mb: 3 }}>
						<Text
							sx={{ fontSize: 1, mb: 2, color: "rgba(248, 251, 255, 0.8)" }}
						>
							Payment Method
						</Text>
						<Select
							value={paymentMethod}
							onChange={(e) => setPaymentMethod(e.target.value)}
							required
							sx={{
								bg: "transparent",
								border: "1px solid rgba(255, 255, 255, 0.15)",
								borderRadius: 4,
								px: 3,
								py: 2,
								color: "text",
								fontSize: 2,
								cursor: "pointer",
								"&:focus": {
									outline: "none",
									borderColor: "#EC3750",
								},
							}}
						>
							<option
								style={{ backgroundColor: "var(--theme-ui-colors-background)" }}
								value="Reimbursement">
								Reimbursement
							</option>
							<option
								style={{ backgroundColor: "var(--theme-ui-colors-background)" }}
								value="HCB Org Transfer">
								HCB Org Transfer
							</option>
							<option
								style={{ backgroundColor: "var(--theme-ui-colors-background)" }}
								value="Grant Card">
								Grant Card
							</option>
						</Select>
					</Box>

					<Box sx={{ mb: 4 }}>
						<Text
							sx={{ fontSize: 1, mb: 2, color: "rgba(248, 251, 255, 0.8)" }}
						>
							Additional Information (Optional)
						</Text>
						<Textarea
							placeholder="Add any additional details for the payment..."
							value={additionalInfo}
							onChange={(e) => setAdditionalInfo(e.target.value)}
							rows={3}
							sx={{
								bg: "transparent",
								border: "1px solid rgba(255, 255, 255, 0.15)",
								borderRadius: 4,
								px: 3,
								py: 2,
								color: "text",
								fontSize: 2,
								fontFamily: "inherit",
								resize: "vertical",
								"&:focus": {
									outline: "none",
									borderColor: "#EC3750",
								},
							}}
						/>
					</Box>

					{error && (
						<Text sx={{ color: "#EC3750", fontSize: 1, mb: 3 }}>{error}</Text>
					)}

					<Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
						<Button
							type="button"
							onClick={onClose}
							disabled={loading}
							sx={{
								bg: "transparent",
								border: "1px solid rgba(255, 255, 255, 0.15)",
								color: "text",
								px: 4,
								py: 2,
								borderRadius: 4,
								fontSize: 2,
								cursor: "pointer",
								"&:hover": {
									bg: "rgba(255, 255, 255, 0.05)",
								},
							}}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={loading}
							sx={{
								bg: "primary",
								color: "white",
								px: 4,
								py: 2,
								borderRadius: 4,
								fontSize: 2,
								fontWeight: "bold",
								cursor: loading ? "not-allowed" : "pointer",
								border: "none",
								opacity: loading ? 0.6 : 1,
								"&:hover": {
									opacity: loading ? 0.6 : 0.9,
								},
							}}
						>
							{loading ? "Submitting..." : "Submit Request"}
						</Button>
					</Box>
				</form>
			</Box>
		</Box>
	);
}

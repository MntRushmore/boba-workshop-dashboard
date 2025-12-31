import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { eventCode, organizerName, organizerEmail, amount, approvedCount, paymentMethod, additionalInfo } = req.body;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  // Validate required fields
  if (!eventCode || !organizerName || !organizerEmail || !amount || !approvedCount || !paymentMethod) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(organizerEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate amount is a positive number
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0 || numAmount > 100000) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  // Validate approvedCount is a positive integer
  const numApprovedCount = Number(approvedCount);
  if (!Number.isInteger(numApprovedCount) || numApprovedCount <= 0 || numApprovedCount > 10000) {
    return res.status(400).json({ error: 'Invalid approved count' });
  }

  // Validate payment method is one of the allowed values
  const allowedPaymentMethods = ['Reimbursement', 'HCB Org Transfer', 'Grant Card'];
  if (!allowedPaymentMethods.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }

  // Sanitize string inputs to prevent XSS in Slack
  const sanitize = (str) => String(str).replace(/[<>&'"]/g, (char) => {
    const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' };
    return entities[char];
  });

  const sanitizedEventCode = sanitize(eventCode).substring(0, 100);
  const sanitizedOrganizerName = sanitize(organizerName).substring(0, 200);
  const sanitizedOrganizerEmail = sanitize(organizerEmail).substring(0, 200);
  const sanitizedPaymentMethod = sanitize(paymentMethod);
  const sanitizedAdditionalInfo = additionalInfo ? sanitize(additionalInfo).substring(0, 1000) : '';

  // Send Slack notification if webhook URL is configured
  if (slackWebhookUrl) {
    try {
      const blocks = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🧋 New Boba Grant Request",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Event Code:*\n${sanitizedEventCode}`
            },
            {
              type: "mrkdwn",
              text: `*Total Amount:*\n$${numAmount}`
            },
            {
              type: "mrkdwn",
              text: `*Organizer:*\n${sanitizedOrganizerName}`
            },
            {
              type: "mrkdwn",
              text: `*Email:*\n${sanitizedOrganizerEmail}`
            },
            {
              type: "mrkdwn",
              text: `*Approved Submissions:*\n${numApprovedCount} × $5`
            },
            {
              type: "mrkdwn",
              text: `*Payment Method:*\n${sanitizedPaymentMethod}`
            }
          ]
        }
      ];

      if (sanitizedAdditionalInfo) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Additional Info:*\n${sanitizedAdditionalInfo}`
          }
        });
      }

      blocks.push({
        type: "divider"
      });

      const slackMessage = { blocks };

      const slackResponse = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackMessage),
      });

      if (!slackResponse.ok) {
        console.error('Failed to send Slack notification:', await slackResponse.text());
        return res.status(500).json({ error: 'Failed to send Slack notification' });
      }

      return res.status(200).json({
        success: true,
        message: 'Grant request submitted successfully',
        requestedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending Slack notification:', error);
      return res.status(500).json({ error: 'Failed to send notification' });
    }
  } else {
    // If no Slack webhook is configured, still accept the request
    console.log('Grant request received (no Slack webhook configured):', {
      eventCode,
      organizerName,
      organizerEmail,
      amount,
      reason,
    });
    return res.status(200).json({
      success: true,
      message: 'Grant request received (Slack notifications not configured)'
    });
  }
}

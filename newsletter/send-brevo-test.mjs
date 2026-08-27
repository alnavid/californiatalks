import fs from "node:fs";

const BREVO_API = "https://api.brevo.com/v3";
const LIST_ID = 2;
const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL;
const replyToEmail = process.env.BREVO_REPLY_TO_EMAIL || senderEmail;
const recipient = process.argv[2];
const campaignName = "California Affordability Snapshot - Brevo Test - 2026-08-20";

if (!apiKey) throw new Error("BREVO_API_KEY is required");
if (!senderEmail) throw new Error("BREVO_SENDER_EMAIL is required");
if (!recipient) throw new Error("Pass the single expected recipient as the first argument");

async function brevo(path, options = {}) {
  const response = await fetch(`${BREVO_API}${path}`, {
    ...options,
    headers: {
      "api-key": apiKey,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

const contacts = await brevo(`/contacts/lists/${LIST_ID}/contacts?limit=50&offset=0&sort=desc`);
const emails = (contacts.contacts || []).map((contact) => contact.email);
if (contacts.count !== 1 || emails.length !== 1 || emails[0] !== recipient) {
  throw new Error(`Refusing to send: list ${LIST_ID} is not the expected one-recipient audience`);
}

const campaigns = await brevo("/emailCampaigns?limit=50&offset=0&sort=desc&excludeHtmlContent=true");
let campaign = (campaigns.campaigns || []).find((item) => item.name === campaignName);

if (!campaign) {
  const htmlContent = fs.readFileSync(
    new URL("./affordability-snapshot-aug2026-california-talks.html", import.meta.url),
    "utf8",
  );
  const created = await brevo("/emailCampaigns", {
    method: "POST",
    body: JSON.stringify({
      sender: { name: "California Talks", email: senderEmail },
      name: campaignName,
      subject: "TEST - California Affordability Snapshot",
      replyTo: replyToEmail,
      htmlContent,
      recipients: { listIds: [LIST_ID] },
      inlineImageActivation: false,
      mirrorActive: false,
    }),
  });
  campaign = await brevo(`/emailCampaigns/${created.id}`);
}

const recipientLists = campaign.recipients?.lists || [];
if (campaign.status === "draft") {
  if (recipientLists.length !== 1 || Number(recipientLists[0]) !== LIST_ID) {
    throw new Error("Refusing to send: draft campaign audience changed after creation");
  }
  await brevo(`/emailCampaigns/${campaign.id}/sendNow`, { method: "POST" });
  await new Promise((resolve) => setTimeout(resolve, 8_000));
  campaign = await brevo(`/emailCampaigns/${campaign.id}`);
}

console.log(JSON.stringify({
  campaignId: campaign.id,
  name: campaign.name,
  status: campaign.status,
  subject: campaign.subject,
  recipientLists: campaign.recipients?.lists || [],
}));

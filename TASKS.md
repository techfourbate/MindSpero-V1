# MindSpero Tasks Left to Complete

## 1. Payment Gateway Reliability (Crucial)
* **Implement Paystack Webhooks:** Currently, your payment verification relies on the user returning to `/dashboard.html` with the success parameters in the URL. If a user's browser closes or crashes before returning, they will be charged, but their subscription won’t activate. You need to implement an endpoint (e.g., `/api/payment/webhook`) to listen for incoming, server-to-server payload events directly from Paystack to update subscription paths safely.

## 2. Security & Cost-Control Enhancements
* **API Rate Limiting:** You are calling OpenAI's APIs on the `/api/nlp/process` endpoint. Malicious actors could spam this endpoint, driving up your OpenAI bill significantly. You need to install a package like `express-rate-limit` to restrict the number of requests per IP address.
* **Input Validation & Sanitization:** Enhance backend payload checking using a library like `joi` or `express-validator` to ensure users don't upload maliciously crafted texts that break the JSON output or SQL arrays.

## 3. Core Features Missing
* **Password Reset & Email Verification System:** The `authController.js` only handles register, login, and user auth status. If a user forgets their password, they cannot recover their account. You need to integrate an email service like `nodemailer` (along with SendGrid, Resend, or equivalent) to send password reset links and verify newly registered emails.
* **Account Settings/Profile Page:** The dashboard currently allows users to view their history and process notes, but there is no interface for users to change their password, upgrade plans (aside from the modal), view billing history, or delete their account.

## 4. Handling OpenAI Edge Cases
* **Text-to-Speech Character Limit:** In `utils/openai.js`, the TTS generation `input: script.slice(0, 4096)` forcefully trims the script text at 4096 characters to avoid OpenAI's hard limit. This will abruptly slice sentences in half for long study sessions. **Task:** Implement logic to split chunks over 4096 characters into multiple API calls and merge the resulting audio buffers, or break it into multiple playable audio files on the frontend.
* **Incomplete JSON Parsing:** Since you are enforcing JSON format in the OpenAI prompt, occasional hallucinations or interrupted tokens might return malformed JSON. Add a retry strategy in `processNotes()` if `JSON.parse(content)` fails.

## 5. Frontend & UX Polish
* **Audio Playback Management:** If a user clicks between different history documents while an audio file is playing, it will likely overlap or keep playing in the background. The JavaScript needs slightly tighter state controls over playing media.
* **Responsive Design Testing:** Ensure your vanilla CSS handles all mobile configurations perfectly, especially for tables and wide document explanation sections.

## 6. Deployment Readiness
* **Server Setup:** Prepare the application to be deployed on an actual server (like an Ubuntu VPS on DigitalOcean or AWS) instead of XAMPP.
* **Production Tools:** Implement `PM2` (so the Node server auto-restarts if it crashes) and configure `Nginx` as a reverse proxy with Let's Encrypt SSL certificates to host the app over secure HTTPS.

# MindSpero - Setup & Documentation

## Core Technologies
- **Backend:** Node.js (Express.js)
- **Database:** MySQL
- **Frontend:** Vanilla JS, HTML, Custom CSS
- **AI Processing:** OpenAI SDK (JSON structured output mode) + TTS Audio
- **Payments:** Flutterwave APIs

## 🚀 Setup Instructions

### 1. Database
You must create a local MySQL database named `mindspero`. Run the provided script from your command line:

```bash
mysql -u root -p < database/schema.sql
```

### 2. Environment Variables
Open the `.env` file in the root folder and configure the following parameters:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `OPENAI_API_KEY`: Get this from your OpenAI developer portal.
- `FLW_SECRET_KEY`: Get your secret key from your Flutterwave dashboard.

### 3. Running the Server

Make sure the project dependencies are fully installed (we ran `npm install` automatically, but you can retry if needed):
```bash
npm install
```

Start the primary server:
```bash
node server.js
```

### 4. Viewing the Application
The app will be accessible at: **http://localhost:3000**
- `/` - Landing page
- `/register.html` - Trial account creation
- `/login.html` - User login
- `/dashboard.html` - Core study application (requires authentication)

If you have payment callbacks returning, they are caught by `/dashboard.html` via search queries (e.g. `?payment=verify&transaction_id=XYZ`).

## Architecture Details

- **PDF Parsing:** Uses `pdf-parse` to convert messy PDF structures into raw text.
- **AI Explanation & Organization:** We pass the text into the `gpt-4o-mini` API forcing a strict `json_object` format to extract exactly:
  1. *Explanation*
  2. *Revision Key Points*
  3. *Exam QA*
  4. *Audio Script*
- **Text-to-Speech:** Converting the *Audio Script* into a playable mp3 via the `/api/nlp/audio` route and storing it dynamically using OpenAI's `tts-1` `alloy` model.
- **Access Control:** User states are checked. If their 30-day trial expires, they are forced to upgrade before accessing further AI extraction tools via strict Express middlewares.

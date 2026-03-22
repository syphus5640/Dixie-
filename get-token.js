const { google } = require("googleapis");
require("dotenv").config();

const code = process.argv[2];

if (!code) {
  console.error("Please provide the authorization code as an argument.");
  console.error("Usage: node get-token.js <YOUR_CODE>");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/oauth2callback"
);

async function getToken() {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Successfully retrieved tokens!");
    console.log("\nAdd the following refresh token to your .env file as GOOGLE_REFRESH_TOKEN:");
    console.log(tokens.refresh_token);
    console.log("\nFull token response:", tokens);
  } catch (error) {
    console.error("Error retrieving tokens:", error.message);
  }
}

getToken();

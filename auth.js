const { google } = require("googleapis");
require("dotenv").config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/oauth2callback"
);

const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/calendar"]
});

console.log("1. Open this URL in your browser to authorize the application:");
console.log(url);
console.log("\n2. After authorizing, you will be redirected to http://localhost:3000/oauth2callback?code=XXXX");
console.log("3. Copy the 'code' parameter from the URL.");
console.log("4. Run the following command to exchange the code for a refresh token:");
console.log("   node get-token.js <YOUR_CODE>");

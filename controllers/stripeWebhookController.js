const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const mailgun = require("mailgun-js");
const sql = require("mssql");
const { connectToDatabase } = require("../config/config");
const ejs = require("ejs");
const path = require("path");

// Initialize Mailgun client
const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});
const crypto = require("crypto");

function generateMagicLink() {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 min

  return { token, expiresAt };
}

async function upsertPaymentRecord(email, paymentIntentId) {
  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("email", sql.NVarChar(255), email)
      .input("payment_intent_id", sql.NVarChar(255), paymentIntentId)
      .input("paid_at", sql.DateTime2, new Date())
      .execute("upsert_paid_user");

    console.log(
      `Payment record ${result.recordset[0].action_taken} for ${email}`
    );
    return result.recordset[0];
  } catch (err) {
    console.error("Database operation failed:", err);
    throw err;
  }
}

async function createMagicLoginLink(email) {
  const pool = await connectToDatabase();

  const { token, expiresAt } = generateMagicLink();

  await pool
    .request()
    .input("email", sql.NVarChar(255), email)
    .input("token", sql.NVarChar(255), token)
    .input("expires_at", sql.DateTime2, expiresAt)
    .input("created_by", sql.VarChar(50), "stripe_webhook").query(`
      INSERT INTO magic_login_tokens
        (email, token, expires_at, created_by)
      VALUES
        (@email, @token, @expires_at, @created_by)
    `);

  return {
    url: `https://dev.ysofthealth.app/onboarding?token=${token}`,
    type: "ONBOARDING",
  };
}

// async function sendConfirmationEmail(email, userName) {
//   const templatePath = path.join(
//     __dirname,
//     "../views/paymentConfirmationEmail.ejs"
//   );
//   const paymentDate = new Date().toLocaleString();

//   try {
//     const htmlContent = await ejs.renderFile(templatePath, {
//       userName,
//       paymentDate,
//     });

//     const data = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: "✅ Payment Successful",
//       html: htmlContent,
//     };

//     await mg.messages().send(data);
//     console.log(`📧 Email sent to ${email}`);
//     return true;
//   } catch (error) {
//     console.error("Mailgun or EJS error:", error.message);
//     throw error;
//   }
// }
async function sendWelcomeEmail({ email, userName, magicLinkUrl }) {
  const templatePath = path.join(__dirname, "../views/welcomeEmail.ejs");

  try {
    const htmlContent = await ejs.renderFile(templatePath, {
      userName,
      magicLinkUrl,
    });

    const data = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to YSoft Health – Complete Your Account",
      html: htmlContent,
    };

    await mg.messages().send(data);
    console.log(`📧 Welcome email with magic link sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Mailgun or EJS error:", error);
    throw error;
  }
}

exports.handleStripeWebhook = async (request, response) => {
  const sig = request.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        if (session.payment_status !== "paid") {
          console.log(`Session ${session.id} not paid, skipping`);
          break;
        }

        const paymentIntentId = session.payment_intent;
        const email = session.customer_details?.email;

        if (!email || !paymentIntentId) {
          console.error("Missing email or payment intent ID in session");
          break;
        }

        try {
          // 1. Save to database using your stored procedure
          const dbResult = await upsertPaymentRecord(email, paymentIntentId);

          // 2. Create magic link
          const magicLinkUrl = await createMagicLoginLink(email);

          // 2. Send confirmation email
          // await sendConfirmationEmail(email);

          // 3. Send welcome email with magic link
          await sendWelcomeEmail({
            toEmail: email,
            magicLinkUrl,
          });

          console.log(
            `✅ Processed payment for ${email} (${dbResult.action_taken})`
          );
        } catch (err) {
          console.error(`Failed to process payment ${paymentIntentId}:`, err);
        }
        break;
      }

      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
        // These are now handled by checkout.session.completed
        console.log(`ℹ️ Received ${event.type} for ${event.data.object.id}`);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Webhook processing error: ${error.message}`);
    return response.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }

  response.json({
    received: true,
    message: "Webhook processed successfully",
  });
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { name, email, subject, message }: ContactFormData = await req.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Send email to support team
    const supportEmail = "support@footypredict.ai";
    
    const emailContent = `
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <tr>
        <td style="padding: 30px; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0 0 20px; color: #666;"><strong>From:</strong> ${name}</p>
          <p style="margin: 0 0 20px; color: #666;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email}</a></p>
          <p style="margin: 0 0 20px; color: #666;"><strong>Subject:</strong> ${subject}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px; background: #f9fafb;">
          <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 16px;">Message:</h3>
          <p style="margin: 0; color: #374151; line-height: 1.6; white-space: pre-wrap;">${message}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 30px; background: #f5f5f5; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 0;">Sent via FootyPredict Contact Form</p>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;

    // Send via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "noreply@footypredict.ai",
        to: supportEmail,
        replyTo: email,
        subject: `[Contact Form] ${subject}`,
        html: emailContent,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error("Resend API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Send confirmation email to user
    const confirmationEmail = `
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <tr>
        <td style="padding: 30px; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);">
          <h1 style="color: white; margin: 0; font-size: 24px;">We Received Your Message</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px;">
          <p style="margin: 0 0 20px; color: #374151;">Hi ${name},</p>
          <p style="margin: 0 0 20px; color: #374151; line-height: 1.6;">
            Thank you for contacting FootyPredict! We've received your message and our team will get back to you within 24 hours.
          </p>
          <p style="margin: 0 0 20px; color: #374151; line-height: 1.6;">
            <strong>Your Message Subject:</strong> ${subject}
          </p>
          <p style="margin: 0 0 30px; color: #374151; line-height: 1.6;">
            In the meantime, if your question is urgent, feel free to reach out via our social media channels or call us during business hours.
          </p>
          <p style="margin: 0; color: #374151;">Best regards,<br><strong>FootyPredict Support Team</strong></p>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 30px; background: #f5f5f5; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 0;">© 2024 FootyPredict. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "noreply@footypredict.ai",
        to: email,
        subject: "We received your message - FootyPredict",
        html: confirmationEmail,
      }),
    });

    console.log(`Contact form submitted from ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Message sent successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing contact form:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

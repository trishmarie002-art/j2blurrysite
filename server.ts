import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from "resend";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  // API Routes
  app.post("/api/contact", async (req, res) => {
    const { name, email, message } = req.body;

    if (!resend) {
      console.error("RESEND_API_KEY is not set");
      return res.status(500).json({ error: "Email service not configured" });
    }

    try {
      const data = await resend.emails.send({
        from: "J 2Blurry Contact <onboarding@resend.dev>",
        to: "garzatricia89@gmail.com", // Sending to the user's email as the business owner
        subject: `New Contact Form Submission from ${name}`,
        html: `
          <h1>New Contact Form Submission</h1>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
      });

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Instagram API Route
  app.get("/api/instagram", async (req, res) => {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!token) {
      return res.status(400).json({ error: "Instagram Access Token not configured" });
    }

    try {
      const response = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${token}`
      );
      const data = await response.json();

      if (data.error) {
        console.error("Instagram API Error:", data.error);
        return res.status(500).json({ error: data.error.message });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching Instagram feed:", error);
      res.status(500).json({ error: "Failed to fetch Instagram feed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

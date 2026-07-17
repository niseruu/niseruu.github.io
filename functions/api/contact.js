const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function classifyResendError(status, responseBody) {
  const error = responseBody.toLowerCase();

  if (status === 401 || error.includes("invalid_api_key") || error.includes("api key is invalid")) {
    return "resend_api_key_rejected";
  }
  if (error.includes("own email address") || error.includes("testing emails")) {
    return "resend_recipient_restricted";
  }
  if (error.includes("domain is not verified") || error.includes("verify a domain")) {
    return "resend_sender_unverified";
  }
  if (error.includes("user-agent") || error.includes("error code 1010")) {
    return "resend_user_agent_rejected";
  }

  return `resend_rejected_${status}`;
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim();
  const message = String(payload.message ?? "").trim();
  const honeypot = String(payload.company ?? payload._honey ?? "").trim();

  if (honeypot) {
    return jsonResponse({ ok: true });
  }

  if (!name || name.length > 120 || !EMAIL_RE.test(email) || !message || message.length > 4000) {
    return jsonResponse({ error: "Please fill in every field with a valid email address." }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return jsonResponse(
      { error: "Contact form isn't configured yet. Please email me directly instead." },
      503
    );
  }

  const toAddress = env.CONTACT_TO_EMAIL || "shafrisyamsuddin@gmail.com";

  let resendResponse;
  try {
    resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "shafri-portfolio-contact/1.0",
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>",
        to: [toAddress],
        reply_to: email,
        subject: `Portfolio contact from ${name}`,
        text: `From: ${name} <${email}>\n\n${message}`,
      }),
    });
  } catch (error) {
    console.error("Resend request failed before receiving a response", error);
    return jsonResponse({ error: "Message could not be sent right now. Please try again later." }, 502);
  }

  if (!resendResponse.ok) {
    const resendError = await resendResponse.text();
    console.error(`Resend rejected contact email (${resendResponse.status})`, resendError);
    return jsonResponse(
      {
        error: "Message could not be sent right now. Please try again later.",
        code: classifyResendError(resendResponse.status, resendError),
      },
      502
    );
  }

  return jsonResponse({ ok: true });
}

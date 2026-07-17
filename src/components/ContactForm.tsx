import { useState } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Status = "idle" | "sending" | "success" | "error";
type RelayResponse = { success?: boolean | string; message?: string };

const CONTACT_EMAIL = "shafrisyamsuddin@gmail.com";
const FORM_ACTION = `https://formsubmit.co/${CONTACT_EMAIL}`;
const FORM_AJAX_ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

function createMailto(name = "", email = "", message = "") {
  const subject = name ? `Portfolio enquiry from ${name}` : "Portfolio enquiry";
  const body = name || email || message
    ? `Name: ${name}\nEmail: ${email}\n\n${message}`
    : "Hello Shafri,\n\n";
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fallbackHref, setFallbackHref] = useState(createMailto());

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const honeypot = String(formData.get("_honey") ?? "").trim();
    const messageMailto = createMailto(name, email, message);
    setFallbackHref(messageMailto);

    if (honeypot) {
      setStatus("success");
      form.reset();
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(FORM_AJAX_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
          _subject: `Portfolio contact from ${name}`,
          _template: "table",
          _honey: "",
          _url: "https://niseruu.github.io/#contact",
        }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null) as RelayResponse | null;
      const rejected = body?.success === false || body?.success === "false";
      if (!response.ok || rejected) throw new Error(body?.message ?? "The email relay could not confirm delivery.");
      setStatus("success");
      form.reset();
      setFallbackHref(createMailto());
    } catch {
      setStatus("error");
      setErrorMessage("THE EMAIL RELAY COULDN'T CONFIRM DELIVERY. YOUR MESSAGE IS STILL HERE—USE THE DIRECT EMAIL LINK BELOW.");
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const statusCode = {
    idle: "FORM // READY",
    sending: "FORM // SENDING",
    success: "FORM // DELIVERED",
    error: "FORM // FALLBACK READY",
  }[status];

  return (
    <form
      onSubmit={handleSubmit}
      action={FORM_ACTION}
      method="POST"
      className="industrial-form"
    >
      <input type="hidden" name="_subject" value="New portfolio contact" />
      <input type="hidden" name="_template" value="table" />
      <input type="hidden" name="_next" value="https://niseruu.github.io/#contact" />
      <input type="hidden" name="_url" value="https://niseruu.github.io/#contact" />

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" name="_honey" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="form-row">
        <label htmlFor="name"><span>01 / NAME</span><input id="name" name="name" type="text" required maxLength={120} placeholder="YOUR NAME" /></label>
        <label htmlFor="email"><span>02 / EMAIL</span><input id="email" name="email" type="email" required maxLength={160} placeholder="YOU@DOMAIN.COM" /></label>
      </div>
      <label htmlFor="message" className="message-field">
        <span>03 / MESSAGE</span>
        <textarea id="message" name="message" required rows={5} maxLength={4000} placeholder="TELL ME WHAT YOU'RE BUILDING" />
      </label>

      <div className="form-submit-row">
        <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={status === "sending"}>
          <span>{status === "sending" ? "TRANSMITTING..." : "SEND MESSAGE"}</span><b>↗</b>
        </motion.button>
        <span className="form-status-code">{statusCode}</span>
      </div>

      <AnimatePresence mode="wait">
        {status === "success" && <motion.p key="success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="form-message form-message--success">MESSAGE RECEIVED. I'LL GET BACK TO YOU SOON.</motion.p>}
        {status === "error" && <motion.p key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="form-message form-message--error">{errorMessage}</motion.p>}
      </AnimatePresence>

      <div className="form-fallback-row">
        <span>RELAY BACKUP // MESSAGE-SAFE</span>
        <a href={fallbackHref}>EMAIL DIRECTLY ↗</a>
      </div>
    </form>
  );
}

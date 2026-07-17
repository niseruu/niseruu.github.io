import { useState } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    if (data.company) {
      setStatus("success");
      form.reset();
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong. Please try again.");
      }
      setStatus("success");
      form.reset();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="industrial-form">
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
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
        <span className="form-status-code">FORM // READY</span>
      </div>

      <AnimatePresence mode="wait">
        {status === "success" && <motion.p key="success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="form-message form-message--success">MESSAGE RECEIVED. I'LL GET BACK TO YOU SOON.</motion.p>}
        {status === "error" && <motion.p key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="form-message form-message--error">{errorMessage}</motion.p>}
      </AnimatePresence>
    </form>
  );
}

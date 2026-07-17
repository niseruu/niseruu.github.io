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
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="hidden" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-muted">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={120}
            className="w-full border-2 border-border bg-surface px-4 py-3 text-ink outline-none transition-colors focus:border-accent/60"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={160}
            className="w-full border-2 border-border bg-surface px-4 py-3 text-ink outline-none transition-colors focus:border-accent/60"
          />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-muted">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          maxLength={4000}
          className="w-full resize-none border-2 border-border bg-surface px-4 py-3 text-ink outline-none transition-colors focus:border-accent/60"
        />
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        type="submit"
        disabled={status === "sending"}
        className="inline-flex w-fit items-center justify-center bg-gradient-to-br from-accent to-accent-2 px-7 py-3 font-display font-bold text-bg-deep shadow-[0_18px_48px_rgba(56,189,248,0.25)] disabled:opacity-60"
      >
        {status === "sending" ? "Sending..." : "Send message"}
      </motion.button>

      <AnimatePresence mode="wait">
        {status === "success" && (
          <motion.p
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="text-sm font-medium text-accent"
          >
            Thanks — your message is in. I'll get back to you soon.
          </motion.p>
        )}
        {status === "error" && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="text-sm font-medium text-accent-3"
          >
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}

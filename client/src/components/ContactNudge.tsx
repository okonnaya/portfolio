import { useEffect, useState } from "react";
import { TELEGRAM_URL } from "../lib/contacts";
import "./ContactNudge.css";

const CONTACT_NUDGE_DELAY_MS = 120_000;
const CONTACT_NUDGE_DISMISSED_KEY = "contact-nudge-dismissed";

export function ContactNudge() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(CONTACT_NUDGE_DISMISSED_KEY) === "true") return;

    const timerId = window.setTimeout(() => {
      setIsVisible(true);
    }, CONTACT_NUDGE_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(CONTACT_NUDGE_DISMISSED_KEY, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside className="contact-nudge" aria-live="polite">
      <button
        className="contact-nudge__close"
        type="button"
        aria-label="закрыть баннер"
        onClick={dismiss}
      >
        <span className="contact-nudge__close-icon" aria-hidden="true" />
      </button>
      <p className="contact-nudge__text">
        {"может пора "}
        <br />
        познакомиться лично?
      </p>
      <a
        className="contact-nudge__link"
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={dismiss}
      >
        написать
      </a>
    </aside>
  );
}

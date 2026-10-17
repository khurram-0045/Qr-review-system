
"use client";

import {
  Suspense,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  getBusinesses,
  starterBusiness,
  type Business,
} from "@/lib/business-store";

type Answers = Record<string, string>;

function ReviewContent() {
  const params = useParams<{ businessId: string }>();
  const searchParams = useSearchParams();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Answers>({});
  const [comment, setComment] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showFallback, setShowFallback] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let found: Business | undefined;

    const config = searchParams.get("config");

    if (config) {
      try {
        const parsed = JSON.parse(config) as Business;

        if (
          parsed.id === params.businessId &&
          typeof parsed.name === "string" &&
          typeof parsed.reviewUrl === "string" &&
          Array.isArray(parsed.categories)
        ) {
          found = parsed;
        }
      } catch {
        // Try locally saved business settings.
      }
    }

    if (!found) {
      try {
        found = getBusinesses().find(
          (item) => item.id === params.businessId
        );
      } catch {
        // Show the unavailable state if loading fails.
      }
    }

    if (!found && params.businessId === starterBusiness.id) {
      found = starterBusiness;
    }

    setBusiness(found ?? null);
    setLoading(false);
  }, [params.businessId, searchParams]);

  const accent = business?.accent || "#2878F0";

  const answeredCount = business
    ? business.categories.filter(
        (category) => Boolean(answers[category.id])
      ).length
    : 0;

  function selectOption(categoryId: string, option: string) {
    setAnswers((current) => ({
      ...current,
      [categoryId]:
        current[categoryId] === option ? "" : option,
    }));

    setError("");
    setNotice("");
  }

  function clearAnswers() {
    setAnswers({});
    setComment("");
    setDraft("");
    setError("");
    setNotice("");
    setShowFallback(false);
  }

  function buildDraft() {
    if (!business) return "";

    const selected = business.categories
      .filter((category) => answers[category.id])
      .map(
        (category) =>
          `${category.name}: ${answers[category.id]}`
      );

    let text = `My experience with ${business.name}: ${selected.join(
      ". "
    )}.`;

    if (comment.trim()) {
      text += ` Additional feedback: ${comment.trim()}`;
    }

    return text;
  }

  async function continueToReview() {
    if (!business || submitting) return;

    if (answeredCount === 0 && !comment.trim()) {
      setError(
        "Choose an option or leave a short comment to continue."
      );
      return;
    }

    let reviewUrl: URL;

    try {
      reviewUrl = new URL(business.reviewUrl.trim());

      if (
        reviewUrl.protocol !== "https:" &&
        reviewUrl.protocol !== "http:"
      ) {
        throw new Error("Invalid URL");
      }
    } catch {
      setError(
        "This business has not configured a valid review link yet."
      );
      return;
    }

    const reviewDraft = buildDraft();

    setDraft(reviewDraft);
    setError("");
    setNotice("");
    setSubmitting(true);
    setShowFallback(false);

    let destination: Window | null = null;

    try {
      // Open the tab during the user's click to reduce popup blocking.
      destination = window.open("about:blank", "_blank");

      await navigator.clipboard.writeText(reviewDraft);

      if (destination) {
        destination.location.href = reviewUrl.href;
      }

      setNotice(
        destination
          ? "Your feedback draft is copied. Paste it into the review page to submit it."
          : "Your draft is copied. Open the review page below and paste it there."
      );
    } catch {
      if (destination && !destination.closed) {
        destination.close();
      }

      setShowFallback(true);
      setNotice(
        "Automatic copying was unavailable. Copy your draft below, then open the review page."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const styles = {
    "--rb-accent": accent,
  } as CSSProperties;

  if (loading) {
    return (
      <main className="rb-page" style={styles}>
        <div className="rb-state">
          <span className="rb-brand-mark">✦</span>
          <h1>Getting things ready</h1>
          <p>Just a moment...</p>
        </div>
      </main>
    );
  }

  if (!business || !business.active) {
    return (
      <main className="rb-page" style={styles}>
        <div className="rb-state">
          <span className="rb-brand-mark">✦</span>
          <h1>
            {business ? "Feedback unavailable" : "Page not found"}
          </h1>
          <p>
            {business
              ? "This business has temporarily paused feedback."
              : "Please scan the latest QR code provided by the business."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="rb-page" style={styles}>
      <div className="rb-background-glow rb-glow-one" />
      <div className="rb-background-glow rb-glow-two" />

      <header className="rb-topbar">
        <a href="/" className="rb-brand" aria-label="ReviewBoost AI home">
          <span className="rb-brand-mark">✦</span>
          <span>
            ReviewBoost <strong>AI</strong>
          </span>
        </a>

        <span className="rb-top-note">
          Your feedback matters <span>♡</span>
        </span>
      </header>

      <section className="rb-card">
        <div className="rb-business">
          <div className="rb-business-avatar" aria-hidden="true">
            {business.name.trim().charAt(0).toUpperCase() || "B"}
          </div>

          <div className="rb-business-details">
            <h1>{business.name}</h1>
            <p>{business.type || "Local Business"}</p>
          </div>

          <span className="rb-secure-label">
            <span className="rb-status-dot" />
            Feedback
          </span>
        </div>

        <div className="rb-intro">
          <span className="rb-kicker">A MOMENT FOR US</span>
          <h2>How was your experience?</h2>
          <p>
            {business.welcome ||
              "Tell us what you enjoyed. It only takes a few taps."}
          </p>
        </div>

        <div className="rb-progress">
          <div className="rb-progress-track">
            <div
              className="rb-progress-fill"
              style={{
                width: `${
                  business.categories.length
                    ? (answeredCount / business.categories.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>

          <span>
            {answeredCount === 0
              ? "Let's get started"
              : `${answeredCount} of ${business.categories.length} answered`}
          </span>
        </div>

        <div className="rb-category-list">
          {business.categories.map((category, index) => (
            <section className="rb-category" key={category.id}>
              <div className="rb-category-heading">
                <span className="rb-category-index">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <h3>{category.name}</h3>

                {answers[category.id] && (
                  <span className="rb-complete">✓</span>
                )}
              </div>

              <div
                className="rb-options"
                role="group"
                aria-label={category.name}
              >
                {category.options.map((option) => {
                  const selected = answers[category.id] === option;

                  return (
                    <button
                      type="button"
                      key={option}
                      className={`rb-option ${
                        selected ? "rb-option-selected" : ""
                      }`}
                      aria-pressed={selected}
                      onClick={() =>
                        selectOption(category.id, option)
                      }
                    >
                      <span className="rb-option-indicator">
                        {selected ? "✓" : ""}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="rb-comment-section">
          <label htmlFor="rb-comment">
            Anything else to share?
            <span>OPTIONAL</span>
          </label>

          <textarea
            id="rb-comment"
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setError("");
              setNotice("");
            }}
            placeholder="Your thoughts help us do better..."
            maxLength={1000}
            rows={3}
          />

          <div className="rb-comment-footer">
            <span>Every honest thought counts.</span>
            <span>{comment.length}/1000</span>
          </div>
        </div>

        {error && (
          <div className="rb-alert rb-alert-error" role="alert">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        {notice && (
          <div className="rb-alert rb-alert-success" role="status">
            <span>✓</span>
            <p>{notice}</p>
          </div>
        )}

        {showFallback && (
          <div className="rb-fallback">
            <label htmlFor="rb-draft">Your feedback draft</label>

            <textarea
              id="rb-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={5}
            />

            <button
              type="button"
              className="rb-copy-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(draft);
                  setNotice("Draft copied. Open the review page below.");
                } catch {
                  const field = document.getElementById(
                    "rb-draft"
                  ) as HTMLTextAreaElement | null;

                  field?.focus();
                  field?.select();

                  setNotice(
                    "Your draft is selected. Copy it, then open the review page."
                  );
                }
              }}
            >
              Copy feedback
            </button>
          </div>
        )}

        <button
          type="button"
          className="rb-submit"
          onClick={continueToReview}
          disabled={submitting}
        >
          <span>
            {submitting ? "Preparing your feedback..." : "Continue to Review"}
          </span>
          {!submitting && <span className="rb-submit-arrow">→</span>}
        </button>

        {notice && (
          <a
            className="rb-open-link"
            href={business.reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open review page ↗
          </a>
        )}

        <button
          type="button"
          className="rb-reset"
          onClick={clearAnswers}
        >
          Clear answers
        </button>

        <div className="rb-honesty">
          <span>✦</span>
          Share feedback that reflects your actual experience.
        </div>
      </section>

      <footer className="rb-footer">
        Made with care by <strong>ReviewBoost AI</strong>
      </footer>
    </main>
  );
}

export default function CustomerReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="rb-page">
          <div className="rb-state">
            <span className="rb-brand-mark">✦</span>
            <h1>Getting things ready</h1>
            <p>Just a moment...</p>
          </div>
        </main>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}

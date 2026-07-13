const questions = [
  "Which message moves undecided voters without weakening the base?",
  "Where does support soften once voters hear the opposition argument?",
  "Which neighborhoods need persuasion, turnout, or a different messenger?",
  "What do residents say is urgent, and what do they actually rank first?",
];

let questionIndex = 0;
const questionText = document.querySelector("#questionText");

window.setInterval(() => {
  if (!questionText) return;
  questionIndex = (questionIndex + 1) % questions.length;
  questionText.animate(
    [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(10px)" },
    ],
    { duration: 180, easing: "ease-out" },
  ).onfinish = () => {
    questionText.textContent = questions[questionIndex];
    questionText.animate(
      [
        { opacity: 0, transform: "translateY(-8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 220, easing: "ease-out" },
    );
  };
}, 3800);

const counters = document.querySelectorAll("[data-count]");

const animateCounter = (node) => {
  const target = Number(node.dataset.count);
  const suffix = node.dataset.suffix || "";
  const start = performance.now();
  const duration = 900;

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = `${Math.round(target * eased).toLocaleString()}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.target.dataset.done) return;
      entry.target.dataset.done = "true";
      animateCounter(entry.target);
    });
  },
  { threshold: 0.35 },
);

counters.forEach((counter) => observer.observe(counter));

if (window.lucide) {
  window.lucide.createIcons();
}

const contactForm = document.querySelector(".contact-form");
const formStatus = document.querySelector(".form-status");

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!formStatus) return;

  const submitButton = contactForm.querySelector("button");
  const originalLabel = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "Sending...";
  formStatus.classList.remove("error");
  formStatus.textContent = "";

  try {
    const response = await fetch(contactForm.action, {
      method: "POST",
      body: new FormData(contactForm),
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error("Form submission failed");

    contactForm.reset();
    formStatus.textContent = "Thank you. Your inquiry has been sent.";
  } catch {
    formStatus.classList.add("error");
    formStatus.textContent = "There was an issue sending the form. Please email ali@californiatalks.org.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
});

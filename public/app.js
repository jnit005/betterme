const screens = {
  landing: document.getElementById("landing"),
  setup: document.getElementById("setup"),
  interview: document.getElementById("interview"),
  complete: document.getElementById("complete")
};

const questions = [
  "Tell me about a challenging situation you faced at work and how you handled it.",
  "Tell me about a time when you had to influence someone who initially disagreed with you.",
  "Describe a situation where something did not go according to plan. What did you do?",
  "Tell me about a time you received difficult feedback. How did you respond?",
  "Describe an achievement that you are particularly proud of and explain what made it successful."
];

let currentQuestion = 0;
let interviewProfile = {};

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.add("hidden"));
  screens[name].classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("startSetup").addEventListener("click", () => {
  showScreen("setup");
});

document.getElementById("setupForm").addEventListener("submit", (event) => {
  event.preventDefault();

  interviewProfile = {
    role: document.getElementById("role").value.trim(),
    domain: document.getElementById("domain").value.trim(),
    experience: document.getElementById("experience").value,
    difficulty: document.getElementById("difficulty").value
  };

  currentQuestion = 0;
  renderQuestion();
  showScreen("interview");
});

function renderQuestion() {
  const number = currentQuestion + 1;
  const total = questions.length;

  document.getElementById("questionNumber").textContent = `Question ${number} of ${total}`;
  document.getElementById("progressFill").style.width = `${(number / total) * 100}%`;
  document.getElementById("questionText").textContent = questions[currentQuestion];
  document.getElementById("recordStatus").textContent = "Ready for your answer";
  document.getElementById("timer").textContent = "00:00";
}

document.getElementById("nextQuestion").addEventListener("click", () => {
  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    renderQuestion();
  } else {
    showScreen("complete");
  }
});

document.getElementById("exitInterview").addEventListener("click", () => {
  if (window.confirm("Exit this interview? Your current practice session will not be saved yet.")) {
    showScreen("setup");
  }
});

document.getElementById("newInterview").addEventListener("click", () => {
  document.getElementById("setupForm").reset();
  showScreen("setup");
});

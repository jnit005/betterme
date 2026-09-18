const screens = {
  auth: document.getElementById("authScreen"),
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
let authMode = "signin";

const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authSubmit = document.getElementById("authSubmit");
const authMessage = document.getElementById("authMessage");
const authSwitch = document.getElementById("authSwitch");
const authSwitchText = document.getElementById("authSwitchText");
const forgotPassword = document.getElementById("forgotPassword");
const accountControls = document.getElementById("accountControls");
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.add("hidden"));
  screens[name].classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setAuthMessage(message, isError = true) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
  authMessage.classList.toggle("success", !isError);
}

function setAuthMode(mode) {
  authMode = mode;
  const signIn = mode === "signin";
  authTitle.textContent = signIn ? "Sign in to BetterMe" : "Create your BetterMe account";
  authSubtitle.textContent = signIn
    ? "Your interview practice sessions will be linked to your account."
    : "Create an account to keep your BetterMe interview practice connected to you.";
  authSubmit.innerHTML = signIn ? "Sign in <span>→</span>" : "Create account <span>→</span>";
  authSwitchText.textContent = signIn ? "Don't have an account?" : "Already have an account?";
  authSwitch.textContent = signIn ? "Create one" : "Sign in";
  forgotPassword.classList.toggle("hidden", !signIn);
  authPassword.setAttribute("autocomplete", signIn ? "current-password" : "new-password");
  setAuthMessage("");
}

authSwitch.addEventListener("click", () => {
  setAuthMode(authMode === "signin" ? "signup" : "signin");
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || password.length < 6) {
    setAuthMessage("Enter a valid email and a password of at least 6 characters.");
    return;
  }

  authSubmit.disabled = true;
  authSubmit.textContent = authMode === "signin" ? "Signing in..." : "Creating account...";
  setAuthMessage("");

  try {
    if (authMode === "signin") {
      await firebase.auth().signInWithEmailAndPassword(email, password);
    } else {
      await firebase.auth().createUserWithEmailAndPassword(email, password);
    }
    authForm.reset();
  } catch (error) {
    const messages = {
      "auth/invalid-credential": "Email or password is incorrect.",
      "auth/user-not-found": "No account was found with this email.",
      "auth/wrong-password": "Email or password is incorrect.",
      "auth/email-already-in-use": "An account already exists with this email.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/too-many-requests": "Too many attempts. Please try again later."
    };
    setAuthMessage(messages[error.code] || "Authentication failed. Please try again.");
  } finally {
    authSubmit.disabled = false;
    authSubmit.innerHTML = authMode === "signin" ? "Sign in <span>→</span>" : "Create account <span>→</span>";
  }
});

forgotPassword.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  if (!email) {
    setAuthMessage("Enter your email address first, then click Forgot password.");
    authEmail.focus();
    return;
  }
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    setAuthMessage("Password reset email sent. Check your inbox.", false);
  } catch (error) {
    setAuthMessage(error.code === "auth/user-not-found"
      ? "No account was found with this email."
      : "We could not send the reset email. Please check the email address and try again.");
  }
});

logoutBtn.addEventListener("click", async () => {
  await firebase.auth().signOut();
});

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    userEmail.textContent = user.email || "Signed in";
    accountControls.classList.remove("hidden");
    showScreen("landing");
  } else {
    accountControls.classList.add("hidden");
    showScreen("auth");
  }
});

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

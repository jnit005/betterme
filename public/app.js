import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

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
  authMessage.classList.toggle("error", isError && !!message);
  authMessage.classList.toggle("success", !isError && !!message);
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

function friendlyAuthError(error) {
  const messages = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account was found with this email.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please try again later."
  };
  return messages[error.code] || error.message || "Authentication failed. Please try again.";
}

async function start() {
  const response = await fetch("firebase-config.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load Firebase configuration (${response.status}).`);
  const firebaseConfig = await response.json();
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  authSwitch.addEventListener("click", () => setAuthMode(authMode === "signin" ? "signup" : "signin"));

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
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      authForm.reset();
    } catch (error) {
      setAuthMessage(friendlyAuthError(error));
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
      await sendPasswordResetEmail(auth, email);
      setAuthMessage("Password reset email sent. Check your inbox.", false);
    } catch (error) {
      setAuthMessage(friendlyAuthError(error));
    }
  });

  logoutBtn.addEventListener("click", () => signOut(auth));

  onAuthStateChanged(auth, (user) => {
    if (user) {
      userEmail.textContent = user.email || "Signed in";
      accountControls.classList.remove("hidden");
      showScreen("landing");
    } else {
      accountControls.classList.add("hidden");
      showScreen("auth");
    }
  });

  document.getElementById("startSetup").addEventListener("click", () => showScreen("setup"));
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

  document.getElementById("nextQuestion").addEventListener("click", () => {
    if (currentQuestion < questions.length - 1) {
      currentQuestion++;
      renderQuestion();
    } else showScreen("complete");
  });

  document.getElementById("exitInterview").addEventListener("click", () => {
    if (window.confirm("Exit this interview? Your current practice session will not be saved yet.")) showScreen("setup");
  });

  document.getElementById("newInterview").addEventListener("click", () => {
    document.getElementById("setupForm").reset();
    showScreen("setup");
  });

  setAuthMode("signin");
}

function renderQuestion() {
  const number = currentQuestion + 1;
  document.getElementById("questionNumber").textContent = `Question ${number} of ${questions.length}`;
  document.getElementById("progressFill").style.width = `${(number / questions.length) * 100}%`;
  document.getElementById("questionText").textContent = questions[currentQuestion];
  document.getElementById("recordStatus").textContent = "Ready for your answer";
  document.getElementById("timer").textContent = "00:00";
}

start().catch(error => {
  console.error(error);
  setAuthMessage("BetterMe could not initialize authentication. Please refresh and try again.");
});

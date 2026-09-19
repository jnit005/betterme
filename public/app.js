import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const screens = {
  auth: document.getElementById("authScreen"),
  landing: document.getElementById("landing"),
  setup: document.getElementById("setup"),
  categories: document.getElementById("categories"),
  interview: document.getElementById("interview"),
  complete: document.getElementById("complete"),
  contact: document.getElementById("contact"),
  faq: document.getElementById("faq")
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
let pendingInterview = false;
let activeUserFirstName = "";
let authMode = "signin";
let auth;
let db;

const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const firstName = document.getElementById("firstName");
const lastName = document.getElementById("lastName");
const nameFields = document.getElementById("nameFields");
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
  nameFields.classList.toggle("hidden", signIn);
  firstName.required = !signIn;
  lastName.required = !signIn;
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
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Please check your internet connection and try again."
  };
  return messages[error.code] || error.message || "Authentication failed. Please try again.";
}

async function start() {
  // Firebase Hosting provides this config automatically for the active project.
  // This avoids storing Firebase configuration in the source files.
  const response = await fetch("/__/firebase/init.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Firebase Hosting configuration could not be loaded (${response.status}).`);
  }

  const firebaseConfig = await response.json();
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  authSwitch.addEventListener("click", () => {
    setAuthMode(authMode === "signin" ? "signup" : "signin");
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value;
    const givenName = firstName.value.trim();
    const familyName = lastName.value.trim();

    if (!email || password.length < 6) {
      setAuthMessage("Enter a valid email and a password of at least 6 characters.");
      return;
    }

    if (authMode === "signup" && (!givenName || !familyName)) {
      setAuthMessage("Enter your first and last name.");
      return;
    }

    authSubmit.disabled = true;
    authSubmit.textContent = authMode === "signin" ? "Signing in..." : "Creating account...";
    setAuthMessage("");

    try {
      if (authMode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const user = credential.user;
        const displayName = `${givenName} ${familyName}`.trim();

        await updateProfile(user, { displayName });
        await setDoc(doc(db, "users", user.uid), {
          firstName: givenName,
          lastName: familyName,
          displayName,
          email: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      authForm.reset();
    } catch (error) {
      console.error("Firebase Authentication error:", error);
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
      console.error("Firebase password reset error:", error);
      setAuthMessage(friendlyAuthError(error));
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      let firstNameValue = "";
      try {
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        if (profileSnap.exists()) {
          firstNameValue = profileSnap.data().firstName || "";
        }
      } catch (error) {
        console.error("Profile read error:", error);
      }

      const displayName = user.displayName || "";
      const fallbackFirstName = displayName.split(" ")[0] || "";
      activeUserFirstName = firstNameValue || fallbackFirstName;
      userEmail.textContent = user.email || "Signed in";
      document.getElementById("accountGreeting").textContent = firstNameValue || fallbackFirstName ? `Hi, ${firstNameValue || fallbackFirstName}` : "Signed in";
      accountControls.classList.remove("hidden");
      document.getElementById("loginTopBtn").classList.add("hidden");
      showScreen("landing");
      if (pendingInterview) {
        pendingInterview = false;
        currentQuestion = 0;
        renderQuestion();
        showScreen("interview");
      }
    } else {
      accountControls.classList.add("hidden");
      document.getElementById("loginTopBtn").classList.remove("hidden");
      showScreen("landing");
    }
  });

  document.getElementById("homeLogo").addEventListener("click", event => {
    event.preventDefault();
    showScreen("landing");
    document.querySelectorAll("[data-view]").forEach(item => item.classList.toggle("active", item.dataset.view === "landing"));
  });
  document.getElementById("loginTopBtn").addEventListener("click", () => {
    setAuthMode("signin");
    showScreen("auth");
  });
  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      if (screens[view]) showScreen(view);
      document.querySelectorAll("[data-view]").forEach(item => item.classList.toggle("active", item === button));
    });
  });
  document.getElementById("startSetup").addEventListener("click", () => showScreen("categories"));
  document.getElementById("backToWelcome").addEventListener("click", () => showScreen("landing"));
  document.getElementById("backToCategories").addEventListener("click", () => showScreen("categories"));

  const pathwayConfigs = {
    engineering: {
      title: "Engineering", eyebrow: "ENGINEERING INTERVIEW", description: "Tell us about your engineering specialism and the role you are targeting.",
      fields: [
        {id:"role",label:"Engineering discipline",type:"select",required:true,options:["Software Engineer","Quality / Test Engineer","DevOps Engineer","AI / Machine Learning Engineer","Data Engineer","Cloud Engineer","Site Reliability Engineer (SRE)","Cybersecurity Engineer","Network Engineer","Systems Engineer"]},
        {id:"domain",label:"Technology / domain",type:"text",placeholder:"e.g. Java, cloud infrastructure, data platforms",required:true},
        {id:"experience",label:"Years of experience",type:"select",required:true,options:["0–2 years","3–5 years","6–10 years","10+ years"]},
        {id:"difficulty",label:"Interview difficulty",type:"select",required:true,options:["Easy","Medium","Hard"]}
      ]
    },
    sales: {
      title: "Sales & Marketing", eyebrow: "SALES & MARKETING INTERVIEW", description: "Share your function, market focus and experience so the practice can be framed appropriately.",
      fields: [
        {id:"role",label:"Target role",type:"select",required:true,options:["Sales Representative / Account Executive","Business Development Representative","Enterprise Account Executive","Sales Engineer / Solutions Engineer","Sales Manager","Marketing Specialist","Digital Marketing Manager","Product Marketing Manager","Growth Marketing Manager","Marketing Manager"]},
        {id:"domain",label:"Industry / market",type:"text",placeholder:"e.g. SaaS, cybersecurity, healthcare",required:true},
        {id:"experience",label:"Years of experience",type:"select",required:true,options:["0–2 years","3–5 years","6–10 years","10+ years"]},
        {id:"difficulty",label:"Interview difficulty",type:"select",required:true,options:["Easy","Medium","Hard"]},
        {id:"focus",label:"Primary interview focus",type:"select",required:true,options:["Behavioral and competency","Sales strategy and execution","Customer discovery and solution selling","Marketing strategy and campaigns","Leadership and management"]}
      ]
    },
    government: {
      title: "Government Exam", eyebrow: "GOVERNMENT EXAM PREPARATION", description: "Select the examination and stage you are preparing for. These details configure the practice session.",
      fields: [
        {id:"exam",label:"Exam / recruitment",type:"select",required:true,options:["UPSC Civil Services","State Public Service Commission","SSC examinations","Banking examinations","Railway recruitment","Defence / armed forces selection","Teaching eligibility / recruitment","Other government examination"]},
        {id:"stage",label:"Preparation stage",type:"select",required:true,options:["Preliminary examination","Mains / written examination","Personality test / interview","Other selection stage"]},
        {id:"targetRole",label:"Target service / post (if applicable)",type:"text",placeholder:"e.g. IAS, state administrative service, inspector",required:false},
        {id:"experience",label:"Preparation experience",type:"select",required:true,options:["Just starting","Less than 6 months","6–12 months","1–2 years","More than 2 years"]},
        {id:"difficulty",label:"Practice difficulty",type:"select",required:true,options:["Easy","Medium","Hard"]},
        {id:"language",label:"Preferred practice language",type:"select",required:true,options:["English","Hindi"]}
      ]
    }
  };

  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
  function renderPathwayForm(key) {
    const config = pathwayConfigs[key];
    if (!config) return;
    interviewProfile = { pathway: key };
    document.getElementById("setupEyebrow").textContent = config.eyebrow;
    document.getElementById("setupHeading").textContent = `${config.title}: personalise your practice`;
    document.getElementById("setupDescription").textContent = config.description;
    document.getElementById("dynamicFields").innerHTML = config.fields.map(field => {
      const label = `<span>${escapeHtml(field.label)}</span>`;
      if (field.type === "select") {
        const opts = field.options.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("");
        return `<label class="field">${label}<select id="${field.id}" name="${field.id}" ${field.required ? "required" : ""}><option value="">Select ${escapeHtml(field.label.toLowerCase())}</option>${opts}</select></label>`;
      }
      return `<label class="field">${label}<input id="${field.id}" name="${field.id}" type="text" placeholder="${escapeHtml(field.placeholder || "")}" ${field.required ? "required" : ""}></label>`;
    }).join("");
    showScreen("setup");
  }

  document.querySelectorAll("[data-pathway]").forEach(button => {
    button.addEventListener("click", () => renderPathwayForm(button.dataset.pathway));
  });

  document.getElementById("setupForm").addEventListener("submit", event => {
    event.preventDefault();
    const config = pathwayConfigs[interviewProfile.pathway];
    if (!config) return;
    const values = {};
    config.fields.forEach(field => {
      const element = document.getElementById(field.id);
      values[field.id] = element ? element.value.trim() : "";
    });
    interviewProfile = { ...interviewProfile, ...values };
    currentQuestion = 0;
    if (!auth.currentUser) {
      pendingInterview = true;
      setAuthMode("signin");
      showScreen("auth");
      setAuthMessage("Please sign in or create an account to launch your interview.", false);
      return;
    }
    renderQuestion();
    showScreen("interview");
  });

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

  document.getElementById("contactForm").addEventListener("submit", event => {
    event.preventDefault();
    document.getElementById("contactFeedback").textContent = "Thanks for your message. Contact submission is not connected yet, so nothing has been sent.";
  });

  setAuthMode("signin");
}

function renderQuestion() {
  const number = currentQuestion + 1;
  document.getElementById("interviewWelcome").textContent = activeUserFirstName
    ? `Hello ${activeUserFirstName}, let’s get started.`
    : "Hello, let’s get started.";
  const labels = { engineering: "ENGINEERING INTERVIEW", sales: "SALES & MARKETING INTERVIEW", government: "GOVERNMENT EXAM PRACTICE" };
  document.querySelector("#interview .eyebrow").textContent = labels[interviewProfile.pathway] || "INTERVIEW PRACTICE";
  document.getElementById("questionNumber").textContent = `Question ${number} of ${questions.length}`;
  document.getElementById("progressFill").style.width = `${(number / questions.length) * 100}%`;
  document.getElementById("questionText").textContent = questions[currentQuestion];
  document.getElementById("recordStatus").textContent = "Ready for your answer";
  document.getElementById("timer").textContent = "00:00";
}

start().catch(error => {
  console.error("BetterMe initialization error:", error);
  setAuthMessage("BetterMe could not initialize. Please refresh the page.");
});

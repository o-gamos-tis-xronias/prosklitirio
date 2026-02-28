let selectedChapter = null;

// utility to keep history size manageable
function pruneChatHistory(maxMessages = 20) {
    if (chatHistory.length <= maxMessages) return;
    const systemMsgs = chatHistory.filter(m => m.role === 'system');
    const otherMsgs = chatHistory.filter(m => m.role !== 'system');
    chatHistory = systemMsgs.concat(otherMsgs.slice(-maxMessages));
}

let chatHistory = [];
let isWaitingForResponse = false;

// ----------------------------
// Initialize
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  const inputForm = document.getElementById("input-area");
  if (inputForm) {
    inputForm.addEventListener("submit", handleFormSubmit);
  }
  loadChatHistory();
});

// ----------------------------
// Form Submission Handler
// ----------------------------
function handleFormSubmit(event) {
  event.preventDefault();
  sendMessage();
  return false;
}

// ----------------------------
// Επιλογή Κεφαλαίου
// ----------------------------
function selectChapterTab(tabElement, chapter) {
  const tabs = document.querySelectorAll("#chapter-selection .tab");
  tabs.forEach(t => t.classList.remove("active"));
  tabElement.classList.add("active");
  tabElement.setAttribute("aria-pressed", "true");
  selectChapter(chapter);
}

function selectChapter(chapter) {
  selectedChapter = chapter.toLowerCase();
  chatHistory = [];
  document.getElementById("chat-box").innerHTML = "";
  document.getElementById("chapter-selection").hidden = true;
  document.getElementById("chat-section").hidden = false;

  // Κύλιση στην κορυφή
  window.scrollTo(0, 0);

  // Μεταφράσεις κεφαλαίων στα ελληνικά
  const chapterNamesGR = {
    transparency: "ΔΙΑΦΑΝΕΙΑ",
    copyright: "ΠΝΕΥΜΑΤΙΚΑ ΔΙΚΑΙΩΜΑΤΑ",
    safety: "ΑΣΦΑΛΕΙΑ ΚΑΙ ΠΡΟΣΤΑΣΙΑ"
  };

  const chapterEmojis = {
    transparency: "📖",
    copyright: "©️",
    safety: "🛡️"
  };

  const chapterGR = chapterNamesGR[selectedChapter] || chapter.toUpperCase();
  const emoji = chapterEmojis[selectedChapter] || "";

  addMessage(
    "system",
    `Έχετε επιλέξει το κεφάλαιο "${emoji} ${chapterGR}". Κάντε ερωτήσεις σχετικά με αυτό το κεφάλαιο και θα σας βοηθήσω να κατανοήσετε τις απαιτήσεις συμμόρφωσης.`
  );

  showSuggestedQuestions(selectedChapter);
}


// ----------------------------
// Convert Markdown-style bold (**text**) into HTML <strong>
// ----------------------------
function convertBoldMarkdown(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// ----------------------------
// Προσθήκη μηνύματος στο chat
// ----------------------------
function addMessage(sender, text) {
  const chatBox = document.getElementById("chat-box");
  const msg = document.createElement("div");
  msg.className = sender;

  if (sender === "system") {
    msg.classList.add("system-message");
    msg.innerHTML = `<em>${text}</em>`;
    msg.style.textAlign = "center";
    msg.style.opacity = "0.8";
    msg.style.marginTop = "0.5rem";
    chatBox.appendChild(msg);
    chatHistory.push({ role: sender, content: text });
    chatBox.scrollTop = chatBox.scrollHeight;
    return;
  }

  if (sender === "assistant") {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l);
    const synopsis = convertBoldMarkdown(lines.shift() || "");
    const analyticText = convertBoldMarkdown(lines.join("\n"));

    // Synopsis με emoji
    const synopsisDiv = document.createElement("div");
    synopsisDiv.className = "synopsis";
    synopsisDiv.innerHTML = addEmojisControlled(highlightGlossaryTerms(synopsis), true);
    msg.appendChild(synopsisDiv);

    // Analytic block
    if (analyticText) {
      const analyticDiv = document.createElement("div");
      analyticDiv.className = "analytic";

      // Χωρίζουμε σε παραγράφους
      const paragraphs = analyticText.split(/\n{2,}/).map(p => p.trim()).filter(p => p);
      analyticDiv.innerHTML = paragraphs.map(p => {
        const formatted = p.replace(/\n/g, "<br>");
        return `<p>${highlightGlossaryTerms(formatted)}</p>`;
      }).join("");

      const btnContainer = document.createElement("div");
      btnContainer.className = "bubble-buttons";

      // Collapse αν μεγάλο
      if (analyticText.length > 300) {
        analyticDiv.classList.add("collapsed-analytic");

        const expandBtn = document.createElement("button");
        expandBtn.innerText = "📖 Ανάλυση";
        expandBtn.title = "Εμφάνιση/Απόκρυψη ανάλυσης";
        expandBtn.onclick = () => {
          analyticDiv.classList.toggle("collapsed-analytic");
          analyticDiv.classList.toggle("expanded");
          expandBtn.innerText = analyticDiv.classList.contains("collapsed-analytic") ? "📖 Ανάλυση" : "📖 Σύμπτυξη";

          // Copy button εμφανίζεται μόνο όταν expanded
          copyBtn.style.display = analyticDiv.classList.contains("expanded") ? "inline-block" : "none";
        };
        btnContainer.appendChild(expandBtn);
      }

      // Copy button
      const copyBtn = document.createElement("button");
      copyBtn.innerText = "📋 Αντιγραφή";
      copyBtn.className = "bubble-copy-btn";
      copyBtn.title = "Αντιγραφή του περιεχομένου";
      copyBtn.style.display = "none";
      copyBtn.onclick = () => {
        const fullText = synopsis + "\n\n" + analyticText;
        navigator.clipboard.writeText(fullText).then(() => {
          copyBtn.innerText = "✅ Αντιγράφηκε!";
          setTimeout(() => (copyBtn.innerText = "📋 Αντιγραφή"), 2000);
        }).catch(() => {
          copyBtn.innerText = "❌ Σφάλμα";
          setTimeout(() => (copyBtn.innerText = "📋 Αντιγραφή"), 2000);
        });
      };

      btnContainer.appendChild(copyBtn);

      msg.appendChild(analyticDiv);
      msg.appendChild(btnContainer);
    }

    chatHistory.push({ role: "assistant", content: text });
  } else {
    // User ή system
    msg.innerText = text;
    if (sender === "user") {
      chatHistory.push({ role: "user", content: text });
    }
  }

  chatBox.appendChild(msg);
  saveChatHistory();
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ----------------------------
// Αποθήκευση και ανάκτηση ιστορικού chat (localStorage)
// ----------------------------
function saveChatHistory() {
  if (selectedChapter) {
    localStorage.setItem(
      `gpai_chat_${selectedChapter}`,
      JSON.stringify(chatHistory)
    );
  }
}

function loadChatHistory() {
  if (selectedChapter) {
    const saved = localStorage.getItem(`gpai_chat_${selectedChapter}`);
    if (saved) {
      try {
        chatHistory = JSON.parse(saved);
        const chatBox = document.getElementById("chat-box");
        chatHistory.forEach(msg => {
          if (msg.role === "user") {
            addMessage("user", msg.content);
          } else if (msg.role === "assistant") {
            addMessage("assistant", msg.content);
          }
        });
      } catch (e) {
        console.warn("Failed to load chat history:", e);
      }
    }
  }
}

// ----------------------------
// Προσθήκη emoji μόνο στο Synopsis (Enhanced)
// ----------------------------
function addEmojisControlled(text, isSynopsis) {
  if (!isSynopsis) return text;

  const emojiMap = {
    "διαφάνεια": "🔍",
    "πνευματικά δικαιώματα": "©️",
    "ασφάλεια": "⚠️",
    "προστασία": "🛡️",
    "κίνδυνος": "⚡",
    "κινδύνου": "⚡",
    "περιστατικό": "🚨",
    "περιστατικών": "🚨",
    "μοντέλο": "🤖",
    "μοντέλων": "🤖",
    "tdm": "📄",
    "άρθρο": "📜",
    "αποκάλυψη": "📢",
    "επεξήγηση": "🧾",
    "πάροχος": "🏢",
    "δεδομένα": "💾",
    "εκπαίδευση": "📚",
    "συμμόρφωση": "✅",
    "req": "📋",
    "requirement": "📋",
    "απαίτηση": "📋",
    "έλεγχος": "🔎",
    "audit": "🔎"
  };

  for (const key in emojiMap) {
    const pattern = new RegExp(`\\b${key}\\b`, "gi");
    if (pattern.test(text)) {
      text = text.replace(pattern, `${emojiMap[key]} $&`);
      break;
    }
  }
  return text;
}

// ----------------------------
// Επισημάνσεις Glossary
// ----------------------------
function highlightGlossaryTerms(text) {
  let result = text;
  Object.keys(glossary).forEach(term => {
    const pattern = new RegExp(`\\b${term}\\b`, "gi");
    result = result.replace(
      pattern,
      `<span class="glossary-term" title="${glossary[term]}">${term}</span>`
    );
  });
  return result;
}

// ----------------------------
// Προτεινόμενες ερωτήσεις (Enhanced)
// ----------------------------
const suggestedQuestions = {
  transparency: [
    "📖 Τι είναι η τεκμηρίωση μοντέλου;",
    "🔍 Ποιες είναι οι υποχρεώσεις αποκάλυψης;",
    "📜 Τι αναφέρει το Άρθρο 53;",
    "📋 Ποια είναι τα βασικά στοιχεία διαφάνειας;",
    "🧾 Τι είναι το Model Card;",
    "📢 Πώς αποκαλύπτω τους περιορισμούς του μοντέλου;"
  ],
  copyright: [
    "©️ Μπορώ να χρησιμοποιήσω δεδομένα που προστατεύονται;",
    "📄 Τι είναι το TDM (Text and Data Mining);",
    "🏢 Ποιες είναι οι πολιτικές πνευματικών δικαιωμάτων;",
    "✅ Πώς εξασφαλίζω νόμιμη πρόσβαση σε δεδομένα;",
    "🚫 Τι είναι ο μηχανισμός opt-out;",
    "📚 Τι κάνω αν ένα έργο αποδεικνύει μη συμμόρφωση;"
  ],
  safety: [
    "⚠️ Τι είναι ο συστημικός κίνδυνος;",
    "🚨 Πώς αναφέρονται σοβαρά περιστατικά;",
    "🛡️ Ποια είναι τα μέτρα μείωσης κινδύνου;",
    "📋 Τι απαιτεί το Άρθρο 55;",
    "🔍 Πώς κάνω αξιολόγηση κινδύνου;",
    "💾 Ποια είναι τα όρια ευθύνης;"
  ]
};

function showSuggestedQuestions(chapter) {
  const container = document.getElementById("suggested-questions");
  container.innerHTML = "";

  const questions = suggestedQuestions[chapter] || [];
  questions.forEach(q => {
    const btn = document.createElement("button");
    btn.innerText = q;
    btn.className = "suggested-question-btn";
    btn.title = "Κάντε κλικ για να ρωτήσετε";
    btn.onclick = () => {
      document.getElementById("user-input").value = q.replace(/^[^\s]*\s/, "");
      sendMessage();
    };
    container.appendChild(btn);
  });

  container.style.display = questions.length ? "flex" : "none";
}

// ----------------------------
// Αποστολή ερώτησης χρήστη
// ----------------------------
async function sendMessage() {
  if (isWaitingForResponse) return;

  const input = document.getElementById("user-input");
  const userText = input.value.trim();
  if (!userText) return;

  input.value = "";
  input.disabled = true;
  isWaitingForResponse = true;

  // Ενημέρωση κουμπιού
  const sendBtn = document.querySelector(".send-btn");
  const originalBtnText = sendBtn.innerHTML;
  sendBtn.disabled = true;
  sendBtn.style.opacity = "0.6";

  addMessage("user", userText);

  const chatBox = document.getElementById("chat-box");

  // Typing indicator
  const typingIndicator = document.createElement("div");
  typingIndicator.className = "assistant";
  typingIndicator.id = "typing-indicator";
  typingIndicator.innerHTML = '<span class="typing-dots">⏳ Σκέψη...</span>';
  chatBox.appendChild(typingIndicator);
  chatBox.scrollTop = chatBox.scrollHeight;

  pruneChatHistory(25);
  const prompt = buildPrompt(userText);

  try {
    const { text: responseText, model } = await callBackend(prompt);
    typingIndicator.remove();
    addMessage("assistant", responseText);
    if (model) {
      addMessage("system", `Μοντέλο: ${model}`);
    }
  } catch (error) {
    typingIndicator.remove();
    console.error("Chat Error:", error);
    
    let errorMessage = "❌ Σφάλμα κατά την επικοινωνία με την υπηρεσία AI.";
    
    if (error.message.includes("network")) {
      errorMessage = "🌐 Σφάλμα σύνδεσης. Ελέγξτε τη σύνδεσή σας και ξαναδοκιμάστε.";
    } else if (error.message.includes("timeout")) {
      errorMessage = "⏱️ Λήξη χρόνου. Η απάντηση κράτησε πολύ. Ξαναδοκιμάστε.";
    }
    
    addMessage("assistant", `**Σφάλμα**\n${errorMessage}`);
  } finally {
    isWaitingForResponse = false;
    input.disabled = false;
    sendBtn.disabled = false;
    sendBtn.style.opacity = "1";
    input.focus();
  }
}

// ----------------------------
// Συντομεύσεις πληκτρολογίου
// ----------------------------
document.addEventListener("keydown", (e) => {
  const input = document.getElementById("user-input");
  if (!input) return;

  // Ctrl/Cmd + Enter για αποστολή
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    if (!isWaitingForResponse) {
      sendMessage();
    }
  }
});

// ----------------------------
// Build prompt (Greek, more “human/ChatGPT-like”)
// ----------------------------
function buildPrompt(userQuestion) {
return `
ΡΟΛΟΣ:
Είσαι ανώτερος νομικός σύμβουλος και ακαδημαϊκός ειδικός στο δίκαιο Τεχνητής Νοημοσύνης της Ευρωπαϊκής Ένωσης.
Γράφεις όπως ένας Έλληνας καθηγητής Νομικής ή δικαστής που εξηγεί με σαφήνεια, νηφαλιότητα και δογματική ακρίβεια.
Το ύφος σου είναι:
- Θεσμικό αλλά ανθρώπινο
- Αναλυτικό αλλά όχι φλύαρο
- Καθαρό, με δομή και νομική ακρίβεια
- Χωρίς υπερβολική αγγλική ορολογία (ελληνικοποιείς όπου είναι εύλογο)

ΠΕΔΙΟ:
Απαντάς ΑΠΟΚΛΕΙΣΤΙΚΑ βάσει του Κανονισμού (ΕΕ) 2024/1689 (AI Act) και του Κώδικα Πρακτικής GPAI.
Εφόσον απαιτείται, συνδέεις με:
- Χάρτη Θεμελιωδών Δικαιωμάτων ΕΕ
- Οδηγία 2019/790 (TDM)
- Ν. 2121/1993
- GDPR
Αν δεν είσαι βέβαιος, το δηλώνεις ρητά.

ΣΥΝΕΧΕΙΑ ΣΥΖΗΤΗΣΗΣ:
Λαμβάνεις υπόψη προηγούμενα μηνύματα της ίδιας συνομιλίας.
Αν η ερώτηση είναι συνέχεια προηγούμενης, ΜΗΝ επαναλαμβάνεις βασικά στοιχεία που ήδη εξηγήθηκαν.
Αν η ερώτηση είναι ασαφής, θέτεις ΜΙΑ στοχευμένη διευκρινιστική ερώτηση.

ΓΛΩΣΣΑ:
Απαντάς εξ ολοκλήρου στα ελληνικά.

ΥΠΟΧΡΕΩΤΙΚΗ ΔΟΜΗ:

Μικρή φυσική εισαγωγή (1 πρόταση).

**Σύνοψη**
Σύντομη, δογματικά ακριβής απάντηση.
1 emoji το πολύ.

🔹🔹🔹
**Κύρια Σημεία**
1. Νομική βάση
2. Υποχρέωση ή αρχή
3. Πρακτική συνέπεια για πάροχο GPAI

🔹🔹🔹
**Ανάλυση**
- Μόνο παράγραφοι.
- Εξηγείς το ratio της διάταξης.
- Διευκρινίζεις τη διαφορά θεωρητικής και πρακτικής συμμόρφωσης.
- Εάν υπάρχει ερμηνευτική αβεβαιότητα, το επισημαίνεις.
- Αν χρειάζεται, αναφέρεις “σημείο προσοχής”.

🔹🔹🔹
**Αναφορές**
- Μόνο πραγματικές νομικές διατάξεις.
- Καμία επινόηση πηγής.

Κεφάλαιο: ${selectedChapter.toUpperCase()}

${chapterRules(selectedChapter)}

Ερώτηση:
"${userQuestion}"
`;
}

// ----------------------------
// Enhanced chapter rules with Greek legal context
// ----------------------------
function chapterRules(chapter) {
  switch (chapter) {
    case "transparency":
      return `
ΔΙΑΦΑΝΕΙΑ & ΤΕΚΜΗΡΙΩΣΗ ΜΟΝΤΕΛΩΝ
Εστίαση: Άρθρα 53-54 Κανονισμού (ΕΕ) 2024/1689
Σχετικές έννοιες: Model documentation, datasheets, δημοσιευμένες πληροφορίες

ΠΟΥ ΕΝΔΙΑΦΕΡΕΙ: Παροχοί GPAI που πρέπει να δημοσιεύσουν μοντέλα documentation
ΑΞΙΟΛΟΓΗΣΗ ΚΙΝΔΥΝΟΥ: Σύμφωνα με Άρθρα 53-54, οι παροχοί πρέπει να αποκαλύψουν:
- Αρχιτεκτονική μοντέλου και χαρακτηριστικά εκπαίδευσης
- Δεδομένα εκπαίδευσης (πηγή, ποσότητα, τύπος)
- Γνωστούς περιορισμούς και ενδεχόμενες παρεμβάσεις
- Μέτρα επιμέρους κρατικών και ιάπειων ρυθμίσεων
- Πληροφορίες για δοκιμές και αξιολόγηση διαφάνειας

ΕΛΛΗΝΙΚΟ ΠΛΑΙΣΙΟ: Η ΑΕΔΠ (Αρχή Προστασίας Δεδομένων Προσώπων) μπορεί να ελέγξει τήρηση.

ΠΑΓΙΔΕΣ: Μη παρέχοντας αρκετές πληροφορίες, ή αναφέροντας ευαίσθητες τεχνικές λεπτομέρειες που δεν πρέπει.
`;
    case "copyright":
      return `
ΠΝΕΥΜΑΤΙΚΑ ΔΙΚΑΙΩΜΑΤΑ & ΝΟΜΙΜΗ ΠΡΟΣΒΑΣΗ
Εστίαση: Άρθρα 6, 51-52 Κανονισμού (ΕΕ) 2024/1689, Οδηγία 2001/29/ΕΚ, GDPR
Σχετικές έννοιες: Lawful access, TDM (Text and Data Mining), opt-out, licensed datasets

ΠΟΥ ΕΝΔΙΑΦΕΡΕΙ: Εταιρείες που χρησιμοποιούν δεδομένα από τρίτους για εκπαίδευση GPAI
ΑΞΙΟΛΟΓΗΣΗ ΚΙΝΔΥΝΟΥ: Παραβίαση πνευματικών δικαιωμάτων ή ιδιωτικότητας χωρίς νόμιμη άδεια/εξαίρεση.
ΥΠΟΧΡΕΩΣΕΙΣ:
- Νόμιμη πρόσβαση σε δεδομένα εκπαίδευσης (άδεια ή εξαίρεση TDM)
- Τεκμηρίωση πολιτικής πνευματικών δικαιωμάτων
- Μηχανισμός opt-out για δημιουργούς που δεν θέλουν έργα τους να χρησιμοποιηθούν

ΕΛΛΗΝΙΚΟ ΠΛΑΙΣΙΟ: Ν. 2121/1993 (Πνευματική Ιδιοκτησία), Ν. 4624/2019 (GDPR imple), κανόνες ΑΕΔΠ.

ΠΑΓΙΔΕΣ: Χρήση δεδομένων χωρίς νόμιμη άδεια, μη τήρηση opt-out αιτημάτων.
`;
    case "safety":
      return `
ΑΣΦΑΛΕΙΑ & ΣΥΣΤΗΜΙΚΟΙ ΚΙΝΔΥΝΟΙ
Εστίαση: Άρθρα 45, 55-56 Κανονισμού (ΕΕ) 2024/1689
Σχετικές έννοιες: Risk assessment, mitigation, incident reporting, cybersecurity, fundamental rights

ΠΟΥ ΕΝΔΙΑΦΕΡΕΙ: Παροχοί GPAI, ιδίως αν τα μοντέλα παρουσιάζουν "συστημικό κίνδυνο"
ΣΥΣΤΗΜΙΚΟΣ ΚΙΝΔΥΝΟΣ = Κίνδυνος στη δημόσια ασφάλεια, θεμελιώδη δικαιώματα, κοινωνία
ΥΠΟΧΡΕΩΣΕΙΣ:
- Αξιολόγηση κινδύνων πριν από κυκλοφορία μοντέλου
- Real-time monitoring για σοβαρά περιστατικά
- Αναφορά περιστατικών στις αρχές (στην Ελλάδα = κεντρικό σημείο επαφής)
- Μέτρα μετριασμού (κυβερνοασφάλεια, δοκιμές, audits)
- Τεκμηρίωση αξιολόγησης και μέτρων

ΕΛΛΗΝΙΚΟ ΠΛΑΙΣΙΟ: Η Ελλάδα θα διορίσει κεντρικό σημείο επαφής για εφαρμογή AI Act.

ΠΑΓΙΔΕΣ: Παράνολη ή μη αναφορά περιστατικών, έλλειψη τεκμηρίωσης κινδύνων, ανεπάρκεια μέτρων μετριασμού.
`;
    default:
      return "Άγνωστο κεφάλαιο";
  }
}


// ----------------------------
// Backend call - Enhanced error handling
// ----------------------------
async function callBackend(prompt) {
  const BACKEND_URL = "https://gpai-bot-backend.onrender.com";

  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "Είστε ανώτερος Έλληνας νομικός σύμβουλος εξειδικευμένος στον AI Act και απαντάτε αποκλειστικά στα ελληνικά με θεσμικό ύφος."
        },
        ...chatHistory,
        { role: "user", content: prompt }
      ]
    })
  });

  if (!res.ok) {
    throw new Error("API Error");
  }

  const data = await res.json();

  if (!data.reply) {
    console.error("Unexpected backend response:", data);
    throw new Error("Invalid backend response");
  }

  return {
    text: data.reply,
    model: data.model || ""
  };
}

// ----------------------------
// Λεξικό Glossary (Comprehensive Greek Legal Terms)
// ----------------------------
const glossary = {
  // Core AI & Regulation Terms
  GPAI: "Τεχνητή Νοημοσύνη Γενικού Σκοπού (GPAI - General Purpose AI): Μοντέλα ΤΝ με ευρεία δυνατότητα, ικανά να εκτελούν πλατύ φάσμα εργασιών και να ενσωματώνονται σε άλλα συστήματα, όπως ορίζεται στον Κανονισμό (ΕΕ) 2024/1689.",
  
  "Κανονισμός ΤΝ": "Ο Κανονισμός (ΕΕ) 2024/1689 (Ευρωπαϊκός Κανονισμός Τεχνητής Νοημοσύνης) που καθορίζει τους κανόνες ανάπτυξης, διάθεσης και χρήσης AI συστημάτων στην Ευρωπαϊκή Ένωση.",
  
  "Άρθρο 53": "Άρθρο 53 Κανονισμού (ΕΕ) 2024/1689: Απαιτήσεις διαφάνειας και τεκμηρίωσης για GPAI. Απαιτείται δημοσίευση μοντέλου datasheet και πληροφοριών χαρακτηριστικών.",
  
  "Άρθρο 55": "Άρθρο 55 Κανονισμού (ΕΕ) 2024/1689: Απαιτήσεις παρακολούθησης, αναφοράς περιστατικών και μετριασμού κινδύνων για GPAI με συστημικό κίνδυνο.",
  
  // Transparency Terms
  "Διαφάνεια μοντέλου": "Η δυνατότητα κατανόησης και επεξήγησης του τρόπου λειτουργίας, των περιορισμών και των αποτελεσμάτων ενός μοντέλου GPAI.",
  
  "Model documentation": "Λεπτομερής τεκμηρίωση που καλύπτει: αρχιτεκτονική μοντέλου, δεδομένα εκπαίδευσης, γνωστούς περιορισμούς, μέτρα κινδύνου και αποδόχεις.",
  
  "Model datasheet": "Τυποποιημένη αναφορά που περιγράφει τη σχεδίαση, χρήση, διαφάνεια, περιορισμούς και ηθικές παραμέτρους ενός AI μοντέλου.",
  
  "Explainability": "Ερμηνευσιμότητα: Η δυνατότητα εξήγησης των αποτελεσμάτων ενός μοντέλου ΤΝ σε κατανοητό τρόπο προς τους χρήστες.",
  
  // Copyright & Data Terms
  "Νόμιμη πρόσβαση": "Πρόσβαση σε δεδομένα για εκπαίδευση ΤΝ μόνο με νόμιμη άδεια (από τον κάτοχο δικαιωμάτων) ή όταν ισχύει νόμιμη εξαίρεση (π.χ. TDM exception).",
  
  "TDM": "Text and Data Mining (Εξόρυξη Κειμένου και Δεδομένων): Αυτοματοποιημένη ανάλυση μεγάλων όγκων δεδομένων για εκπαίδευση AI. Στην ΕΕ, επιτρέπεται υπό ορισμένες προϋποθέσεις και με μηχανισμό opt-out.",
  
  "Opt-out μηχανισμός": "Δικαίωμα ιδιοκτητών πνευματικών δικαιωμάτων (συγγραφέων, εκδοτών) να αποκλείσουν τα έργα τους από σύνολα δεδομένων για εκπαίδευση GPAI.",
  
  "Licensed dataset": "Σύνολο δεδομένων με νόμιμη άδεια χρήσης για εκπαίδευση μοντέλου, όπου ο πάροχος έχει εξασφαλίσει τις απαραίτητες άδειες.",
  
  "Πολιτική πνευματικών δικαιωμάτων": "Δημοσιευμένη πολιτική ενός παρόχου GPAI που τεκμηριώνει πώς τηρούνται τα πνευματικά δικαιώματα στην εκπαίδευση του μοντέλου.",
  
  "Γενική εξαίρεση TDM": "Εξαίρεση από περιορισμούς πνευματικών δικαιωμάτων που επιτρέπει Text and Data Mining για ορισμένες χρήσεις, συμπεριλαμβανομένης της ΤΝ, με δυνατότητα opt-out.",
  
  // Risk & Safety Terms
  "Συστημικός κίνδυνος": "Κίνδυνος που προέρχεται από προηγμένα GPAI μοντέλα και ενδέχεται να προκαλέσουν σημαντικές βλάβες στη δημόσια ασφάλεια, τα θεμελιώδη δικαιώματα ή την κοινωνία σε ευρεία κλίμακα.",
  
  "Αξιολόγηση κινδύνου": "Συστηματική διαδικασία εντοπισμού, ανάλυσης και αξιολόγησης πιθανών κινδύνων ενός AI συστήματος πριν από αν ανάπτυξη ή κυκλοφορία.",
  
  "Risk mitigation": "Μετριασμός κινδύνου: Μέτρα που λαμβάνονται για μείωση της πιθανότητας, συχνότητας ή σοβαρότητας των εντοπισθέντων κινδύνων.",
  
  "Incident reporting": "Αναφορά περιστατικών: Νόμιμη υποχρέωση παρόχων GPAI να αναφέρουν σοβαρά περιστατικά (δυσλειτουργίες, παραβάσεις) στις δημόσιες αρχές.",
  
  "Κυβερνοασφάλεια": "Ασφάλεια πληροφοριών: Μέτρα προστασίας για αποφυγή μη εξουσιοδοτημένης πρόσβασης, εκμετάλλευσης ή αλλοίωσης AI συστημάτων και δεδομένων.",
  
  "Real-time monitoring": "Συνεχής παρακολούθηση της απόδοσης και ασφάλειας ενός GPAI μοντέλου για ταχεία ανίχνευση προβλημάτων ή περιστατικών.",
  
  // User & Privacy Terms
  "Privacy by design": "Ενσωμάτωση προστασίας προσωπικών δεδομένων από τη σχεδίαση καθώς και σε όλες τις φάσεις του AI συστήματος.",
  
  "GDPR": "Γενικός Κανονισμός Προστασίας Δεδομένων (GDPR - General Data Protection Regulation) της ΕÐ που ρυθμίζει τη χρήση προσωπικών δεδομένων.",
  
  "Αρχή Προστασίας Δεδομένων": "ΑΕΔΠ: Ανεξάρτητη δημόσια αρχή της Ελλάδας που επιβλέπει τη συμμόρφωση με τον GDPR και τη νομοθεσία προστασίας δεδομένων.",
  
  // Governance Terms
  "Ευθύνη παρόχου": "Γνήσια υπευθυνότητα παρόχων GPAI για τη συμμόρφωση με όλες τις υποχρεώσεις του Κανονισμού ΤΝ.",
  
  "Audit trail": "Καταγεγραμμένη ιστορία ενεργειών, αποφάσεων και αλλαγών στο σύστημα για σκοπούς λογοδοσίας και ελέγχου.",
  
  "Bias mitigation": "Μετριασμός προκατάληψης: Μέτρα για εντοπισμό και ελαχιστοποίηση άδικων διακρίσεων ή προκαταλήψεων στα αποτελέσματα του μοντέλου.",
  
  "Fundamental rights": "Θεμελιώδη δικαιώματα: Δικαιώματα που προστατεύονται από τη Δήλωση Ανθρωπίνων Δικαιωμάτων και τη Χάρτα Θεμελιωδών Δικαιωμάτων της ΕΕ (ιδιοτέλεια, μη διάκρι­ση, κλπ.).",
  
  // Compliance Terms
  "Συμμόρφωση": "Compliance: Τήρηση όλων των απαιτήσεων της νομοθεσίας σχετικής με AI, ιδίως του Κανονισμού (ΕΕ) 2024/1689.",
  
  "Δημοσίευση πληροφοριών": "Δημοσία ανακοίνωση πληροφοριών σχετικά με μοντέλο GPAI, όπως απαιτείται από το Άρθρο 53, π.χ., μοντέλου datasheet.",
  
  "Trade secrets": "Εμπορικά μυστικά: Πληροφορίες που συγκρατούνται απόρρητες για ανταγωνιστικό πλεονέκτημα και δεν χρειάζεται να δημοσιευθούν.",
  
  "Validator": "Επικυρωτής: Τρίτο μέρος που αξιολογεί / ελέγχει τη συμμόρφωση ενός GPAI μοντέλου με τις ρυθμίσεις.",
  
  "Notified Body": "Γνωστοποιημένο Φορέα: Ανεξάρτητη οργάνωση που εξουσιοδοτεί δημόσιες Αρχές να πραγματοποιεί αξιολόγησης συμμόρφωσης.",
  
  // Greek-specific Terms
  "Ελληνική νομοθεσία": "Νόμοι και κανονισμοί του Ελληνικού Κράτους που ενσωματώνουν ή εφαρμόζουν τις ευρωπαϊκές οδηγίες και κανονισμούς για ΤΝ.",
  
  "Κεντρικό σημείο επαφής": "Το εθνικό όργανο της Ελλάδας που θα συντονίζει την εφαρμογή και την επιβολή του Κανονισμού (ΕΕ) 2024/1689.",
  
  "Σημείο προσοχής": "Προειδοποίηση για πιθανή παγίδα ή σημαντικό στοιχείο που χρήζει ιδιαίτερης προσοχής κατά την εφαρμογή απαιτήσεων συμμόρφωσης.",

"Κανονιστική συμμόρφωση": "Η ουσιαστική και όχι μόνο τυπική τήρηση των υποχρεώσεων του Κανονισμού ΤΝ, με τεκμηριωμένη απόδειξη εφαρμογής.",

"Ratio legis": "Ο σκοπός και η λογική θεμελίωση μιας νομοθετικής διάταξης, που καθοδηγεί την ερμηνεία της.",

"Αρχή αναλογικότητας": "Θεμελιώδης αρχή του ενωσιακού δικαίου που επιβάλλει τα μέτρα συμμόρφωσης να είναι κατάλληλα, αναγκαία και μη υπέρμετρα.",

"Θεμελιώδη δικαιώματα": "Δικαιώματα που κατοχυρώνονται στον Χάρτη Θεμελιωδών Δικαιωμάτων της ΕΕ και επηρεάζουν την εφαρμογή του AI Act.",

"Ερμηνευτική ασάφεια": "Κατάσταση κατά την οποία μια διάταξη επιδέχεται περισσότερες της μίας νομικά βάσιμες ερμηνείες.",

"Καταλογισμός ευθύνης": "Η νομική απόδοση ευθύνης σε πάροχο για μη συμμόρφωση ή πρόκληση ζημίας.",

"Συμμόρφωση κατ’ ουσίαν": "Η ουσιαστική εφαρμογή των υποχρεώσεων και όχι απλή ύπαρξη εγγράφων ή πολιτικών.",

"Τεκμήριο συμμόρφωσης": "Νομική υπόθεση ότι ένας πάροχος συμμορφώνεται εφόσον πληροί συγκεκριμένα πρότυπα ή κώδικες.",

"Καλή πίστη": "Αρχή του ενωσιακού και αστικού δικαίου που επιβάλλει ειλικρινή και έντιμη συμπεριφορά.",

"Δογματική ανάλυση": "Συστηματική ερμηνεία διατάξεων βάσει νομικής θεωρίας και συστηματικής ένταξης στο δίκαιο."
};

// ------ End of App ------

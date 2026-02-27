document.addEventListener("DOMContentLoaded", () => {

    /* ===============================
    CONSTANTS
    =============================== */

    const WEDDING_TIME =
        new Date("2026-05-10T13:00:00+02:00").getTime();

    const SCROLL_INTENSITY = 0.18;
    const INERTIA = 0.12;

    /* ===============================
    MEMORY LAYER STATE ENGINE
    =============================== */

    const memoryLayer = {
        visitedSections: new Set(),
        sessionStart: Date.now()
    };

    /* ===============================
    SCROLL PHYSICS ENGINE
    =============================== */

    let currentScroll = window.pageYOffset;
    let targetScroll = currentScroll;

    function transcendentalScrollLoop() {

        const heroContent = document.querySelector(".hero-content");

        /* Physics interpolation */
        currentScroll += (targetScroll - currentScroll) * INERTIA;

        if (heroContent) {

            const sessionAge =
                (Date.now() - memoryLayer.sessionStart) / 60000;

            const motionFactor =
                Math.max(0.6, 1 - sessionAge * 0.03);

            heroContent.style.transform =
				`translate3d(0, ${currentScroll *
                SCROLL_INTENSITY *
                motionFactor}px, 0)`;

            const fadeProgress = Math.pow(
                    Math.min(
                        window.pageYOffset /
                        (window.innerHeight * 0.9),
                        1),
                    1.4);

            heroContent.style.opacity = 1 - fadeProgress;
        }

        requestAnimationFrame(transcendentalScrollLoop);
    }

    /* Scroll listener (throttled) */

    let ticking = false;

    window.addEventListener("scroll", () => {

        if (!ticking) {

            requestAnimationFrame(() => {
                targetScroll = window.pageYOffset;
                ticking = false;
            });

            ticking = true;
        }
    });

    transcendentalScrollLoop();

    /* ===============================
    SECTION REVEAL OBSERVER
    =============================== */

    const revealObserver = new IntersectionObserver(entries => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                const section = entry.target;
                const id = section.id || section.className;

                if (!memoryLayer.visitedSections.has(id)) {

                    section.style.transitionDuration = "1.2s";
                    memoryLayer.visitedSections.add(id);

                } else {
                    section.style.transitionDuration = "0.7s";
                }

                section.classList.add("visible");
            }
        });

    }, {
        threshold: 0.25
    });

    document.querySelectorAll("section")
    .forEach(el => revealObserver.observe(el));

    /* ===============================
    COSMIC COUNTDOWN CLOCK
    =============================== */

    function cosmicCountdown() {

        const diff = WEDDING_TIME - Date.now();

        if (diff < 0)
            return;

        const days = Math.floor(diff / 86400000);
        const hours = Math.floor(diff / 3600000) % 24;
        const minutes = Math.floor(diff / 60000) % 60;
        const seconds = Math.floor(diff / 1000) % 60;

        const bind = (id, value) => {
            const el = document.getElementById(id);
            if (el)
                el.textContent = value;
        };

        bind("days", days);
        bind("hours", hours);
        bind("minutes", minutes);
        bind("seconds", seconds);
    }

    setInterval(cosmicCountdown, 1000);
    cosmicCountdown();

    /* ===============================
    MUSIC IMMERSION ENGINE
    =============================== */

    const musicBtn = document.getElementById("music-control");
    const music = document.getElementById("wedding-music");

    let musicPlaying = false;

    musicBtn?.addEventListener("click", () => {

        if (!music)
            return;

        if (!musicPlaying) {
            music.play().catch(() => {});
            musicBtn.textContent = "⏸";
        } else {
            music.pause();
            musicBtn.textContent = "🎵";
        }

        musicPlaying = !musicPlaying;
    });

    /* ===============================
    RSVP FORM HANDLING (GOOGLE SHEETS)
    =============================== */

    const rsvpForm = document.getElementById("rsvp-form");
    const confirmationMessage = document.getElementById("confirmation-message");

    const attendanceSelect = document.getElementById("attendance");
    const guestsGroup = document.getElementById("guests-group");
    const guestsSelect = document.getElementById("guests");

    const honeypotField = document.getElementById("website");

    /* Guests visibility logic */

    if (attendanceSelect) {

        attendanceSelect.addEventListener("change", function () {

            if (this.value === "yes") {

                guestsGroup.classList.add("show");
                guestsSelect.setAttribute("required", "required");

                setTimeout(() => guestsSelect.focus(), 250);

            } else {

                guestsGroup.classList.remove("show");
                guestsSelect.removeAttribute("required");

                guestsSelect.value = "";
            }
        });
    }

    /* ===============================
    GOOGLE SCRIPT ENDPOINT
    =============================== */

    const GOOGLE_SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbxd4D7xWDKhWq_HrZ2xpnkbKrl2rY4NJJ6cT4DM7I2omuoycJ5sDn7CLC0gaT7OMbNJOg/exec";

    /* ===============================
    FORM SUBMISSION ENGINE
    =============================== */

    let submitting = false;

    if (rsvpForm) {

        rsvpForm.addEventListener("submit", async function (e) {

            e.preventDefault();

            if (submitting)
                return;

            /* Honeypot spam protection */
            if (honeypotField && honeypotField.value !== "") {
                console.log("Bot detected.");
                return;
            }

            const submitBtn = rsvpForm.querySelector(".submit-btn");
            const originalText = submitBtn.textContent;

            const name = document.getElementById("name").value.trim();
            const phone = document.getElementById("phone").value.trim();
            const attendance = attendanceSelect.value;
            const guests = guestsSelect.value;

            /* Validation */

            if (!name || !phone || !attendance) {
                alert("Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία.");
                return;
            }

            if (attendance === "yes" && !guests) {
                alert("Παρακαλώ επιλέξτε τον αριθμό ατόμων.");
                return;
            }

            submitting = true;

            submitBtn.disabled = true;
            submitBtn.textContent = "Αποστολή...";

            try {

                const formData = new URLSearchParams();

                formData.append("name", name);
                formData.append("phone", phone);
                formData.append("attendance", attendance);
                formData.append("guests", attendance === "yes" ? guests : "0");
                formData.append("timestamp", new Date().toISOString());

                /* Submit and check response from Apps Script */
                try {
                    const response = await fetch(GOOGLE_SCRIPT_URL, {
                        method: "POST",
                        headers: {
                            "Accept": "text/plain"
                        },
                        body: formData
                    });

                    const text = await response.text().catch(() => null);

                    if (!response.ok || !text || text.indexOf("Success") === -1) {
                        throw new Error(text || "Failed to save RSVP");
                    }

                } catch (err) {
                    console.error("RSVP submission error:", err);

                    alert(
                        "Υπήρξε πρόβλημα με την αποστολή του RSVP. " +
                        "Παρακαλώ δοκιμάστε ξανά ή επικοινωνήστε τηλεφωνικά.");

                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    submitting = false;
                    return;
                }

                /* Confirmation UI */

                const confirmationContent =
                    confirmationMessage.querySelector(".confirmation-content");

                if (confirmationContent) {

                    if (attendance === "no") {

                        confirmationContent.innerHTML = `
					<span class="confirmation-icon">✓</span>
					<h3>Ευχαριστούμε!</h3>
					<p>Λυπούμαστε που δεν θα είστε μαζί μας.</p>
					`;

                    } else {

                        confirmationContent.innerHTML = `
					<span class="confirmation-icon">✓</span>
					<h3>Ευχαριστούμε!</h3>
					<p>Σας περιμένουμε με χαρά!</p>
					`;
                    }
                }

                rsvpForm.style.display = "none";
                confirmationMessage.classList.add("show");

                setTimeout(() => {
                    confirmationMessage.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }, 120);

                rsvpForm.reset();
                guestsGroup.classList.remove("show");

            } catch (error) {

                console.error(error);

                alert(
                    "Υπήρξε πρόβλημα με την αποστολή του RSVP. " +
                    "Παρακαλώ δοκιμάστε ξανά ή επικοινωνήστε τηλεφωνικά.");

                submitBtn.disabled = false;
                submitBtn.textContent = originalText;

            } finally {
                submitting = false;
            }

        });
    }

    /* ===============================
    Modal Close Logic
    =============================== */

    const modal = document.getElementById("modal");

    modal?.addEventListener("click", e => {

        if (e.target === modal) {
            modal.classList.remove("active");
            document.body.classList.remove("modal-open");
        }

    });

    /* ===============================
    SECRET EASTER EGGS
    =============================== */

    const coupleNames = document.querySelector(".couple-names");

    let clickCount = 0;

    if (coupleNames) {

        coupleNames.addEventListener("click", function () {

            clickCount++;

            if (clickCount === 2) {

                /* Heartbeat pulse */
                this.style.animation = "none";

                setTimeout(() => {
                    this.style.animation =
                        "heroFadeUp 1.5s ease-out, heartbeat 1.2s ease-in-out";
                }, 20);

                /* Floating romantic particles */
                const hearts = ["💕", "💖", "💗", "💓", "💞"];

                hearts.forEach((heart, index) => {

                    setTimeout(() => {

                        const el = document.createElement("div");

                        el.textContent = heart;

                        el.style.position = "fixed";
                        el.style.left =
                            Math.random() * window.innerWidth + "px";

                        el.style.top = "60%";

                        el.style.fontSize = "2.6rem";
                        el.style.opacity = "0.9";

                        el.style.pointerEvents = "none";
                        el.style.zIndex = "9999";

                        el.style.animation = "floatHeart 3s ease-out forwards";

                        document.body.appendChild(el);

                        setTimeout(() => el.remove(), 3000);

                    }, index * 220);
                });

                clickCount = 0;
            }
        });
    }

    const couple = document.querySelector(".couple-names");

    let secretClicks = 0;

    couple?.addEventListener("click", () => {

        secretClicks++;

        if (secretClicks === 3) {

            couple.classList.add("heart-pulse");

            setTimeout(() => {
                couple.classList.remove("heart-pulse");
            }, 1400);

            secretClicks = 0;
        }
    });
    
    /* ===============================
    CLIPBOARD SANCTUARY ENGINE
    =============================== */

    window.copyToClipboard = function (id) {

        const el = document.getElementById(id);
        if (!el)
            return;

        const btn =
            el.parentElement.querySelector("button");

        navigator.clipboard.writeText(el.value).then(() => {

            if (btn) {

                const original = btn.textContent;

                btn.textContent = "✦ Αντιγράφηκε";
                btn.classList.add("copied");

                setTimeout(() => {
                    btn.textContent = original;
                    btn.classList.remove("copied");
                }, 1500);
            }

        });

    };

});
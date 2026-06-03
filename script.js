const body = document.body;
body.classList.add("js-ready");
const navToggle = document.querySelector("[data-nav-toggle]");
const progressBar = document.querySelector(".scroll-progress span");

const updateProgress = () => {
  if (!progressBar) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
};

window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });
}

document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.pushState(null, "", link.getAttribute("href"));
  });
});

document.querySelectorAll("[data-ba-slider]").forEach((slider) => {
  const input = slider.querySelector("input");
  const update = () => slider.style.setProperty("--pos", `${input.value}%`);
  input.addEventListener("input", update);
  update();
});

const filterButtons = document.querySelectorAll("[data-filter]");
const projects = document.querySelectorAll("[data-category]");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    projects.forEach((project) => {
      const visible = filter === "all" || project.dataset.category === filter;
      project.hidden = !visible;
    });
  });
});

// Rate limiting helper
function checkRateLimit() {
  const now = Date.now();
  const limitTime = 60 * 60 * 1000; // 1 hour
  let submissions = JSON.parse(localStorage.getItem("osum_submissions") || "[]");
  submissions = submissions.filter(time => now - time < limitTime);
  localStorage.setItem("osum_submissions", JSON.stringify(submissions));
  return submissions.length < 3;
}

function recordSubmission() {
  const submissions = JSON.parse(localStorage.getItem("osum_submissions") || "[]");
  submissions.push(Date.now());
  localStorage.setItem("osum_submissions", JSON.stringify(submissions));
}

// Sanitization helper to prevent XSS
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

function showConfirmationModal(message, targetUrl) {
  // Create modal container
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  modalOverlay.setAttribute("role", "dialog");
  modalOverlay.setAttribute("aria-modal", "true");
  modalOverlay.setAttribute("aria-labelledby", "modal-title");

  modalOverlay.innerHTML = `
    <div class="modal-box reveal is-visible">
      <h3 id="modal-title">Request Verified Successfully!</h3>
      <p>Thank you for choosing Osum Paints. Your quotation request has been validated and compiled.</p>
      <p class="modal-redirect-text">Redirecting to WhatsApp to send details in <strong id="countdown-num">3</strong> seconds...</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
        <a class="btn btn-accent" id="modal-proceed" href="${targetUrl}">Proceed Now</a>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);
  
  const proceedBtn = modalOverlay.querySelector("#modal-proceed");
  const cancelBtn = modalOverlay.querySelector("#modal-cancel");
  const countdownNum = modalOverlay.querySelector("#countdown-num");
  
  cancelBtn.focus();

  let count = 3;
  const timer = setInterval(() => {
    count--;
    if (countdownNum) countdownNum.textContent = count;
    if (count <= 0) {
      clearInterval(timer);
      window.location.href = targetUrl;
    }
  }, 1000);

  const closeModal = () => {
    clearInterval(timer);
    modalOverlay.remove();
  };

  cancelBtn.addEventListener("click", closeModal);
  proceedBtn.addEventListener("click", () => {
    clearInterval(timer);
  });

  modalOverlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });
}

const quoteForms = document.querySelectorAll("[data-quote-form]");

quoteForms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    
    const statusText = form.querySelector(".form-status");
    if (statusText) {
      statusText.hidden = true;
      statusText.textContent = "";
      statusText.classList.remove("is-error");
    }

    if (!checkRateLimit()) {
      if (statusText) {
        statusText.hidden = false;
        statusText.textContent = "Rate limit reached. Please limit quote requests to 3 per hour. Contact us directly if urgent.";
        statusText.classList.add("is-error");
      }
      return;
    }

    const data = new FormData(form);
    const name = sanitizeInput(data.get("name") || "Customer");
    const email = sanitizeInput(data.get("email") || "");
    const phone = sanitizeInput(data.get("phone") || "");
    const service = sanitizeInput(data.get("service") || "Painting & Waterproofing");
    const timeline = sanitizeInput(data.get("timeline") || "Flexible");
    const location = sanitizeInput(data.get("location") || "Jaipur");
    const details = sanitizeInput(data.get("message") || "");

    // Validation checks
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^[0-9+()\- ]{7,20}$/;

    if (!name || name.length < 2) {
      if (statusText) {
        statusText.hidden = false;
        statusText.textContent = "Please enter a valid name (at least 2 characters).";
        statusText.classList.add("is-error");
      }
      return;
    }

    if (!email || !emailRegex.test(email)) {
      if (statusText) {
        statusText.hidden = false;
        statusText.textContent = "Please enter a valid email address.";
        statusText.classList.add("is-error");
      }
      return;
    }

    if (!phone || !phoneRegex.test(phone)) {
      if (statusText) {
        statusText.hidden = false;
        statusText.textContent = "Please enter a valid phone number.";
        statusText.classList.add("is-error");
      }
      return;
    }

    if (!location || location.length < 3) {
      if (statusText) {
        statusText.hidden = false;
        statusText.textContent = "Please provide your project area or location in Jaipur.";
        statusText.classList.add("is-error");
      }
      return;
    }
    
    // Build comprehensive message
    let message = `*New Quote Request from Osum Paints Website*\n\n`;
    message += `👤 Name: ${name}\n`;
    message += `📧 Email: ${email}\n`;
    message += `📱 Phone: ${phone}\n`;
    message += `🎨 Service: ${service}\n`;
    message += `⏰ Timeline: ${timeline}\n`;
    message += `📍 Location: ${location}\n`;
    if (details) {
      message += `📝 Details: ${details}\n`;
    }
    message += `\nPlease send me a quote.`;
    
    recordSubmission();
    const waUrl = `https://wa.me/919829276414?text=${encodeURIComponent(message)}`;
    showConfirmationModal(message, waUrl);
  });
});

document.querySelectorAll(".section-head, .card, .cta-box, .faq, .contact-layout, .lab-copy, .lab-photo, .story-intro, .story-step, .story-frame, .story-stack").forEach((item) => {
  item.classList.add("reveal");
});

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px 260px 0px" })
  : null;

document.querySelectorAll(".reveal").forEach((item) => {
  if (revealObserver) revealObserver.observe(item);
  else item.classList.add("is-visible");
});

document.querySelectorAll("[data-tilt]").forEach((item) => {
  item.addEventListener("pointermove", (event) => {
    const rect = item.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - .5) * 8;
    const y = ((event.clientY - rect.top) / rect.height - .5) * -8;
    item.style.transform = `rotateX(${y}deg) rotateY(${x}deg)`;
  });

  item.addEventListener("pointerleave", () => {
    item.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
});

const sceneCanvas = document.getElementById("paintScene");

if (sceneCanvas) {
  let fallbackStarted = false;
  const fallbackTimer = window.setTimeout(() => {
    fallbackStarted = true;
    initCanvasPaintScene(sceneCanvas);
  }, 900);

  import("https://unpkg.com/three@0.164.1/build/three.module.js")
    .then((module) => {
      if (fallbackStarted) return;
      window.clearTimeout(fallbackTimer);
      initThreePaintScene(module);
    })
    .catch(() => {
      if (fallbackStarted) return;
      window.clearTimeout(fallbackTimer);
      initCanvasPaintScene(sceneCanvas);
    });
}

function initThreePaintScene(THREE) {
  const canvas = sceneCanvas;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  camera.position.set(0, 0, 9);

  const group = new THREE.Group();
  scene.add(group);

  const orbGeometry = new THREE.IcosahedronGeometry(1.72, 18);
  const orbMaterial = new THREE.MeshStandardMaterial({
    color: 0x28a9ff,
    roughness: .32,
    metalness: .28,
    emissive: 0x0b2a42,
    emissiveIntensity: .38
  });
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  group.add(orb);

  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x45e3d1, transparent: true, opacity: .54, side: THREE.DoubleSide });
  const ringOne = new THREE.Mesh(new THREE.TorusGeometry(2.45, .015, 16, 180), ringMaterial);
  const ringTwo = new THREE.Mesh(new THREE.TorusGeometry(3.05, .012, 16, 180), ringMaterial.clone());
  ringTwo.material.color.set(0x9ef76b);
  ringTwo.material.opacity = .42;
  ringOne.rotation.x = 1.18;
  ringTwo.rotation.x = 1.55;
  ringTwo.rotation.y = .35;
  group.add(ringOne, ringTwo);

  const dropletMaterial = new THREE.MeshStandardMaterial({ color: 0x9ef76b, roughness: .18, metalness: .12, emissive: 0x274a16, emissiveIntensity: .28 });
  const dropletGeometry = new THREE.SphereGeometry(.16, 24, 24);
  const droplets = Array.from({ length: 18 }, (_, index) => {
    const dot = new THREE.Mesh(dropletGeometry, dropletMaterial.clone());
    dot.userData.angle = index * .72;
    dot.userData.radius = 2.35 + (index % 5) * .18;
    dot.userData.speed = .35 + (index % 4) * .035;
    group.add(dot);
    return dot;
  });

  scene.add(new THREE.AmbientLight(0xffffff, 1.25));
  const key = new THREE.PointLight(0x45e3d1, 4.2, 18);
  key.position.set(3.5, 3.8, 5);
  scene.add(key);
  const fill = new THREE.PointLight(0x9ef76b, 2.2, 18);
  fill.position.set(-4, -2, 5);
  scene.add(fill);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(rect.height, 1);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  const pointer = { x: 0, y: 0 };
  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - .5) * 1.4;
    pointer.y = ((event.clientY - rect.top) / rect.height - .5) * 1.1;
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();

  const render = () => {
    const time = clock.getElapsedTime();
    group.rotation.y += ((pointer.x * .24) - group.rotation.y) * .035;
    group.rotation.x += ((-pointer.y * .18) - group.rotation.x) * .035;
    orb.rotation.y = reducedMotion ? .35 : time * .18;
    orb.rotation.x = reducedMotion ? .2 : time * .09;
    ringOne.rotation.z = reducedMotion ? .4 : time * .18;
    ringTwo.rotation.z = reducedMotion ? -.7 : -time * .14;
    droplets.forEach((dot) => {
      const angle = dot.userData.angle + time * dot.userData.speed;
      dot.position.set(Math.cos(angle) * dot.userData.radius, Math.sin(angle * 1.18) * .72, Math.sin(angle) * dot.userData.radius * .42);
    });
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };
  render();
}

function initCanvasPaintScene(canvas) {
  const context = canvas.getContext("2d");
  const colors = ["#28A9FF", "#45E3D1", "#9EF76B"];
  let width = 0;
  let height = 0;
  let pointerX = 0;
  let pointerY = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    width = Math.max(1, Math.floor(rect.width * ratio));
    height = Math.max(1, Math.floor(rect.height * ratio));
    canvas.width = width;
    canvas.height = height;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - .5;
    pointerY = (event.clientY - rect.top) / rect.height - .5;
  });

  const draw = (time) => {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    context.clearRect(0, 0, w, h);
    context.save();
    context.translate(w / 2 + pointerX * 24, h / 2 + pointerY * 18);

    const glow = context.createRadialGradient(0, 0, 20, 0, 0, Math.min(w, h) * .44);
    glow.addColorStop(0, "rgba(69,227,209,.38)");
    glow.addColorStop(1, "rgba(69,227,209,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, Math.min(w, h) * .45, 0, Math.PI * 2);
    context.fill();

    for (let ring = 0; ring < 3; ring += 1) {
      context.strokeStyle = colors[ring];
      context.globalAlpha = .72 - ring * .15;
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(0, 0, 190 + ring * 38, 58 + ring * 14, time / 2400 + ring * .75, 0, Math.PI * 2);
      context.stroke();
    }

    const gradient = context.createLinearGradient(-140, -140, 150, 160);
    gradient.addColorStop(0, "#9EF76B");
    gradient.addColorStop(.45, "#45E3D1");
    gradient.addColorStop(1, "#28A9FF");
    context.globalAlpha = 1;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, 126, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(255,255,255,.32)";
    context.beginPath();
    context.arc(-42, -54, 34, 0, Math.PI * 2);
    context.fill();

    for (let i = 0; i < 20; i += 1) {
      const angle = time / 1200 + i * .68;
      const radius = 178 + (i % 5) * 18;
      context.fillStyle = colors[i % colors.length];
      context.globalAlpha = .76;
      context.beginPath();
      context.arc(Math.cos(angle) * radius, Math.sin(angle * 1.1) * 74, 4 + (i % 3), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

// Service Worker pre-registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        console.log("[Service Worker] Registered successfully:", reg.scope);
      })
      .catch((err) => {
        console.warn("[Service Worker] Registration failed:", err);
      });
  });
}

// src/utils/confetti.js
export function burstConfetti(root = document.body, count = 24) {
  for (let i = 0; i < count; i++) {
    const span = document.createElement("span");
    span.className = "mini-confetti";
    span.style.left = Math.random() * 100 + "%";
    span.style.setProperty("--tx", (Math.random() * 200 - 100) + "px");
    span.style.setProperty("--ty", (Math.random() * -180 - 80) + "px");
    span.style.setProperty("--rot", (Math.random() * 360) + "deg");
    root.appendChild(span);
    setTimeout(() => span.remove(), 1200);
  }
}

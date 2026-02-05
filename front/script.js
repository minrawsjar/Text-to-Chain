import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { renderSpotlightContent } from "./elements/step-cards.js";

gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
  // Inject step cards first
  const container = document.getElementById("spotlight-content");
  if (container) container.innerHTML = renderSpotlightContent();

  // Theme toggle
  const html = document.documentElement;
  const themeToggle = document.querySelector(".theme-toggle");
  const saved = localStorage.getItem("ttc-theme");
  if (saved === "light") html.setAttribute("data-theme", "light");

  themeToggle?.addEventListener("click", () => {
    const isLight = html.getAttribute("data-theme") === "light";
    html.setAttribute("data-theme", isLight ? "" : "light");
    localStorage.setItem("ttc-theme", isLight ? "dark" : "light");
  });

  // Lenis smooth scroll
  const lenis = new Lenis();
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Stroke: run after layout so .spotlight height is correct (injected content)
  function initStroke() {
    const path = document.getElementById("stroke-path");
    if (!path) return;

    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;

    gsap.to(path, {
      strokeDashoffset: 0,
      ease: "none",
      scrollTrigger: {
        trigger: ".spotlight",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
    });

    // Cards: fade in as they enter, fade out as they leave (scrub)
    document.querySelectorAll(".step-card").forEach((card) => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: card,
          start: "top 90%",
          end: "bottom 10%",
          scrub: 1,
        },
      });
      tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "none" });
      tl.to(card, { opacity: 0, duration: 0.35, ease: "none" }, 0.65);
    });

    lenis.on("scroll", ScrollTrigger.update);
    ScrollTrigger.refresh();
  }

  // Wait for layout then init stroke; refresh again on load
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initStroke();
    });
  });
  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
  });
});

"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroThreeCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Accessibility & Low-spec Check
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isLowPower =
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4) ||
      ((navigator as any).connection && (navigator as any).connection.saveData);

    if (prefersReducedMotion || isLowPower) {
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const isMobile = width < 768;

    // 2. Three.js Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 3. Concentric Radar Pulse Rings
    // Color palette aligns with design: #015186 (sky tone) and #1d1c19 (ink tone)
    const baseColor = new THREE.Color(0x015186);
    const ringCount = isMobile ? 4 : 6;
    const segments = isMobile ? 48 : 80;

    interface RadarRing {
      line: THREE.LineLoop;
      points: THREE.Points;
      materialLine: THREE.LineBasicMaterial;
      materialPoints: THREE.PointsMaterial;
      progress: number; // 0.0 to 1.0 (from center to max radius)
      speed: number;
    }

    const maxRadius = isMobile ? 3.0 : 4.2;
    const rings: RadarRing[] = [];

    // Center geometry shared by loops
    for (let i = 0; i < ringCount; i++) {
      const positions = new Float32Array(segments * 3);
      for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        positions[s * 3] = Math.cos(theta);
        positions[s * 3 + 1] = Math.sin(theta);
        positions[s * 3 + 2] = 0;
      }

      const geomLine = new THREE.BufferGeometry();
      geomLine.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const matLine = new THREE.LineBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.0,
        linewidth: 1,
      });

      const lineLoop = new THREE.LineLoop(geomLine, matLine);
      scene.add(lineLoop);

      // Points for thin dotted radar ring aesthetic
      const geomPoints = geomLine.clone();
      const matPoints = new THREE.PointsMaterial({
        color: baseColor,
        size: isMobile ? 1.5 : 2.0,
        transparent: true,
        opacity: 0.0,
      });
      const points = new THREE.Points(geomPoints, matPoints);
      scene.add(points);

      // Staggered initial phases
      rings.push({
        line: lineLoop,
        points,
        materialLine: matLine,
        materialPoints: matPoints,
        progress: i / ringCount,
        speed: 0.08 + Math.random() * 0.015,
      });
    }

    // 4. Scroll Tracking (Scroll increases pulse scale/speed gently)
    let currentScroll = 0;
    let targetScroll = 0;

    const handleScroll = () => {
      targetScroll = window.scrollY || document.documentElement.scrollTop || 0;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // 5. Visibility Tracking (Pause when tab not visible)
    let isVisible = true;
    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 6. Animation Loop (Slow pulse radiating outward, fading near edge)
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Smooth scroll lerp
      currentScroll += (targetScroll - currentScroll) * 0.1;
      // Scroll booster: slightly boost scale and speed with scroll
      const scrollFactor = Math.min(Math.max(currentScroll / 800, 0), 1);
      const speedMultiplier = 1.0 + scrollFactor * 0.45;
      const extraScale = 1.0 + scrollFactor * 0.15;

      for (const r of rings) {
        // Advance pulse position
        r.progress += (r.speed * speedMultiplier * delta) * 0.35;
        if (r.progress > 1.0) {
          r.progress = r.progress % 1.0;
        }

        // Current radius: starts small near center, expands to maxRadius
        const rCurrent = Math.max(0.1, r.progress * maxRadius * extraScale);
        r.line.scale.set(rCurrent, rCurrent, 1);
        r.points.scale.set(rCurrent, rCurrent, 1);

        // Opacity envelope: soft fade-in near center, stays subtle, fades out to 0 at edge
        // Max opacity kept very gentle (~0.18) so it doesn't overpower background art
        let alpha = 0.0;
        if (r.progress < 0.2) {
          alpha = (r.progress / 0.2) * 0.16;
        } else {
          alpha = (1.0 - r.progress) * 0.18;
        }

        r.materialLine.opacity = alpha;
        r.materialPoints.opacity = alpha * 0.85;
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // 7. Responsive Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);

      rings.forEach((r) => {
        scene.remove(r.line);
        scene.remove(r.points);
        r.line.geometry.dispose();
        r.points.geometry.dispose();
        r.materialLine.dispose();
        r.materialPoints.dispose();
      });

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none z-[1] overflow-hidden"
      aria-hidden="true"
    />
  );
}

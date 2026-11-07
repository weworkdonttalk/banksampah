"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroThreeCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check low-spec device or reduced-motion
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

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // Subtle concentric radar rings/particles aligned with radar aesthetic
    const ringCount = 3;
    const rings: THREE.LineLoop[] = [];

    for (let r = 0; r < ringCount; r++) {
      const radius = 1.2 + r * 0.9;
      const segments = 64;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array((segments + 1) * 3);

      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * radius;
        positions[i * 3 + 1] = Math.sin(theta) * radius;
        positions[i * 3 + 2] = 0;
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({
        color: 0x015186,
        transparent: true,
        opacity: 0.12 - r * 0.03,
      });

      const line = new THREE.LineLoop(geometry, material);
      scene.add(line);
      rings.push(line);
    }

    let animationFrameId: number;
    let isVisible = true;

    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    let clock = new THREE.Clock();

    const animate = () => {
      if (isVisible) {
        const elapsedTime = clock.getElapsedTime();
        rings.forEach((ring, index) => {
          ring.rotation.z = elapsedTime * (0.05 + index * 0.02);
          const scale = 1 + Math.sin(elapsedTime * 0.8 + index) * 0.03;
          ring.scale.set(scale, scale, 1);
        });
        renderer.render(scene, camera);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

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
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      rings.forEach((r) => {
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      });
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none z-[1] overflow-hidden opacity-60"
      aria-hidden="true"
    />
  );
}

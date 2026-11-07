"use client";

import { useEffect, useRef } from "react";

export default function PearCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
    if (!gl) return;

    // Vertex Shader
    const vsSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Fragment Shader (Fluid Ink + Chromatic Distortion + Scroll Turbulence)
    const fsSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform float uTime;
      uniform float uScroll;

      // Pseudo-random noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      // Fractional Brownian Motion
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p = rot * p * 2.0 + vec2(100.0);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
        
        // Mouse interaction distance
        vec2 m = uMouse * aspect;
        vec2 p = uv * aspect;
        float dist = length(p - m);
        float mouseWave = exp(-dist * 6.0) * sin(dist * 24.0 - uTime * 3.5) * 0.04;

        // Scroll turbulence wave (Pear & Getlayers fluid motion)
        float scrollWave = sin(uv.y * 12.0 + uScroll * 8.0 + uTime * 1.5) * 0.015;

        // Fluid distortion coordinates
        vec2 q = uv + vec2(mouseWave + scrollWave, mouseWave * 0.5);
        float n1 = fbm(q * 3.2 + uTime * 0.05 + uScroll * 0.4);
        float n2 = fbm(q * 5.5 - vec2(n1, mouseWave) + uTime * 0.07);

        // Subtle chromatic dispersion
        float r = fbm(uv + vec2(n2 * 0.018, 0.0));
        float g = fbm(uv);
        float b = fbm(uv - vec2(n2 * 0.018, 0.0));

        // Soft ink wash tint matching Pear warm palette
        vec3 paperBase = vec3(0.949, 0.945, 0.929); // #f2f1ed
        vec3 inkTone   = vec3(0.114, 0.110, 0.098); // #1d1c19
        vec3 skyTone   = vec3(0.004, 0.318, 0.525); // #015186

        float mask = smoothstep(0.42, 0.78, n2) * 0.09;
        mask += (mouseWave + abs(scrollWave)) * 1.4;

        vec3 color = mix(paperBase, inkTone, clamp(mask, 0.0, 0.18));
        color = mix(color, skyTone, mouseWave * 0.7 + abs(scrollWave) * 0.4);

        // Very fine film grain
        float grain = (hash(uv + fract(uTime)) - 0.5) * 0.02;
        color += grain;

        gl_FragColor = vec4(color, 0.7);
      }
    `;

    const createShader = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(prog, "aPosition");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uResLoc = gl.getUniformLocation(prog, "uResolution");
    const uMouseLoc = gl.getUniformLocation(prog, "uMouse");
    const uTimeLoc = gl.getUniformLocation(prog, "uTime");
    const uScrollLoc = gl.getUniformLocation(prog, "uScroll");

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResLoc, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);

    let targetX = 0.5;
    let targetY = 0.5;
    let curX = 0.5;
    let curY = 0.5;

    let targetScroll = 0;
    let curScroll = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX / window.innerWidth;
      targetY = 1.0 - e.clientY / window.innerHeight;
    };

    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      targetScroll = docHeight > 0 ? window.scrollY / docHeight : 0;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("scroll", onScroll, { passive: true });

    let isVisible = true;
    const onVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    let animId: number;
    let startTime = performance.now();

    const render = () => {
      if (isVisible) {
        const now = performance.now();
        const elapsed = (now - startTime) * 0.001;

        curX += (targetX - curX) * 0.06;
        curY += (targetY - curY) * 0.06;
        curScroll += (targetScroll - curScroll) * 0.08;

        gl.uniform2f(uMouseLoc, curX, curY);
        gl.uniform1f(uTimeLoc, elapsed);
        gl.uniform1f(uScrollLoc, curScroll);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-65"
      aria-hidden="true"
    />
  );
}

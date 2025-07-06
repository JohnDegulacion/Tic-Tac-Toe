"use client";

import { useEffect, useRef } from "react";
import { Renderer, Transform, Vec3, Color } from "ogl";
// @ts-expect-error: Polyline is in extras and not typed
import { Polyline } from "ogl/src/extras/Polyline.js";

interface RibbonsProps {
  colors?: string[];
  baseSpring?: number;
  baseFriction?: number;
  baseThickness?: number;
  offsetFactor?: number;
  maxAge?: number;
  pointCount?: number;
  speedMultiplier?: number;
  enableFade?: boolean;
  enableShaderEffect?: boolean;
  effectAmplitude?: number;
  backgroundColor?: [number, number, number, number];
}

type RibbonLine = {
  spring: number;
  friction: number;
  points: Vec3[];
  mouseVelocity: Vec3;
  mouseOffset: Vec3;
  polyline: {
    mesh: {
      program: {
        uniforms: {
          uTime: { value: number };
        };
      };
      setParent: (parent: Transform) => void;
    };
    updateGeometry: () => void;
    resize: () => void;
  };
};

const Ribbons = ({
  colors = ["#FC8EAC"],
  baseSpring = 0.03,
  baseFriction = 0.9,
  baseThickness = 30,
  offsetFactor = 0.05,
  maxAge = 500,
  pointCount = 50,
  speedMultiplier = 0.6,
  enableFade = false,
  enableShaderEffect = false,
  effectAmplitude = 2,
  backgroundColor = [0, 0, 0, 0],
}: RibbonsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({
      dpr: window.devicePixelRatio || 2,
      alpha: true,
    });
    const gl = renderer.gl;

    gl.clearColor(...backgroundColor);
    Object.assign(gl.canvas.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    });
    container.appendChild(gl.canvas);

    const scene = new Transform();
    const lines: RibbonLine[] = [];

    const vertex = `precision highp float;
      attribute vec3 position, next, prev;
      attribute vec2 uv;
      attribute float side;
      uniform vec2 uResolution;
      uniform float uDPR, uThickness, uTime, uEnableShaderEffect, uEffectAmplitude;
      varying vec2 vUV;

      vec4 getPosition() {
          vec4 current = vec4(position, 1.0);
          vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
          vec2 nextScreen = next.xy * aspect;
          vec2 prevScreen = prev.xy * aspect;
          vec2 tangent = normalize(nextScreen - prevScreen);
          vec2 normal = vec2(-tangent.y, tangent.x);
          normal /= aspect;
          normal *= mix(1.0, 0.1, pow(abs(uv.y - 0.5) * 2.0, 2.0));
          float dist = length(nextScreen - prevScreen);
          normal *= smoothstep(0.0, 0.02, dist);
          float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);
          float pixelWidth = current.w * pixelWidthRatio;
          normal *= pixelWidth * uThickness;
          current.xy -= normal * side;
          if(uEnableShaderEffect > 0.5) {
            current.xy += normal * sin(uTime + current.x * 10.0) * uEffectAmplitude;
          }
          return current;
      }

      void main() {
          vUV = uv;
          gl_Position = getPosition();
      }
    `;

    const fragment = `precision highp float;
      uniform vec3 uColor;
      uniform float uOpacity, uEnableFade;
      varying vec2 vUV;
      void main() {
          float fadeFactor = 1.0;
          if(uEnableFade > 0.5) {
              fadeFactor = 1.0 - smoothstep(0.0, 1.0, vUV.y);
          }
          gl_FragColor = vec4(uColor, uOpacity * fadeFactor);
      }
    `;

    function resize() {
      if (!container) return;
      renderer.setSize(container.clientWidth, container.clientHeight);
      lines.forEach((line) => line.polyline.resize());
    }

    window.addEventListener("resize", resize);

    const center = (colors.length - 1) / 2;

    colors.forEach((color, index) => {
      const spring = baseSpring + (Math.random() - 0.5) * 0.05;
      const friction = baseFriction + (Math.random() - 0.5) * 0.05;
      const thickness = baseThickness + (Math.random() - 0.5) * 3;
      const mouseOffset = new Vec3(
        (index - center) * offsetFactor + (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.1,
        0
      );

      const points = Array.from({ length: pointCount }, () => new Vec3());

      const polyline = new Polyline(gl, {
        points,
        vertex,
        fragment,
        uniforms: {
          uColor: { value: new Color(color) },
          uThickness: { value: thickness },
          uOpacity: { value: 1.0 },
          uTime: { value: 0.0 },
          uEnableShaderEffect: { value: enableShaderEffect ? 1.0 : 0.0 },
          uEffectAmplitude: { value: effectAmplitude },
          uEnableFade: { value: enableFade ? 1.0 : 0.0 },
          uResolution: { value: [gl.canvas.width, gl.canvas.height] },
          uDPR: { value: window.devicePixelRatio || 1 },
        },
      });
      polyline.mesh.setParent(scene);

      lines.push({
        spring,
        friction,
        points,
        mouseVelocity: new Vec3(),
        mouseOffset,
        polyline,
      });
    });

    resize();

    const mouse = new Vec3();
    const tmp = new Vec3();
    const updateMouse = (e: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      let x = 0,
        y = 0;
      if ("changedTouches" in e && e.changedTouches.length) {
        x = e.changedTouches[0].clientX - rect.left;
        y = e.changedTouches[0].clientY - rect.top;
      } else if ("clientX" in e) {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }
      const w = container.clientWidth;
      const h = container.clientHeight;
      mouse.set((x / w) * 2 - 1, (y / h) * -2 + 1, 0);
    };

    container.addEventListener("mousemove", updateMouse);
    container.addEventListener("touchstart", updateMouse);
    container.addEventListener("touchmove", updateMouse);

    let lastTime = performance.now();
    let frameId: number;

    const update = () => {
      frameId = requestAnimationFrame(update);
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;

      lines.forEach((line) => {
        tmp
          .copy(mouse)
          .add(line.mouseOffset)
          .sub(line.points[0])
          .multiply(line.spring);
        line.mouseVelocity.add(tmp).multiply(line.friction);
        line.points[0].add(line.mouseVelocity);

        for (let i = 1; i < line.points.length; i++) {
          const alpha = Math.min(
            1,
            (dt * speedMultiplier) / (maxAge / (line.points.length - 1))
          );
          line.points[i].lerp(line.points[i - 1], alpha);
        }

        if (line.polyline?.mesh?.program?.uniforms?.uTime) {
          line.polyline.mesh.program.uniforms.uTime.value = now * 0.001;
        }
        line.polyline.updateGeometry();
      });

      renderer.render({ scene });
    };
    update();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      container.removeEventListener("mousemove", updateMouse);
      container.removeEventListener("touchstart", updateMouse);
      container.removeEventListener("touchmove", updateMouse);
      if (gl.canvas?.parentNode === container) {
        container.removeChild(gl.canvas);
      }
    };
  }, [
    colors,
    baseSpring,
    baseFriction,
    baseThickness,
    offsetFactor,
    maxAge,
    pointCount,
    speedMultiplier,
    enableFade,
    enableShaderEffect,
    effectAmplitude,
    backgroundColor,
  ]);

  return <div ref={containerRef} className="relative w-full h-full" />;
};

export default Ribbons;

"use client";

import { useEffect, useRef } from "react";

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
    const container = containerRef.current;
    if (!container) {
      console.error("Container ref is null");
      return;
    }

    // Set initial size
    container.style.width = "100%";
    container.style.height = "100%";

    let cleanup: (() => void) | undefined;

    const initRibbons = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { Renderer, Transform, Vec3, Color, Polyline } = await import(
          "ogl"
        );

        const renderer = new Renderer({
          dpr: Math.min(window.devicePixelRatio || 2, 2), // Cap DPR at 2
          alpha: true,
          antialias: true, // Add antialiasing
        });
        const gl = renderer.gl;

        if (Array.isArray(backgroundColor) && backgroundColor.length === 4) {
          gl.clearColor(
            backgroundColor[0],
            backgroundColor[1],
            backgroundColor[2],
            backgroundColor[3]
          );
        } else {
          gl.clearColor(0, 0, 0, 0);
        }

        gl.canvas.style.position = "absolute";
        gl.canvas.style.top = "0";
        gl.canvas.style.left = "0";
        gl.canvas.style.width = "100%";
        gl.canvas.style.height = "100%";
        container.appendChild(gl.canvas);

        const scene = new Transform();
        const lines: any[] = [];

        const vertex = `
          precision highp float;
          
          attribute vec3 position;
          attribute vec3 next;
          attribute vec3 prev;
          attribute vec2 uv;
          attribute float side;
          
          uniform vec2 uResolution;
          uniform float uDPR;
          uniform float uThickness;
          uniform float uTime;
          uniform float uEnableShaderEffect;
          uniform float uEffectAmplitude;
          
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

        const fragment = `
          precision highp float;
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uEnableFade;
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
          const width = container!.clientWidth;
          const height = container!.clientHeight;
          renderer.setSize(width, height);
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

          const line = {
            spring,
            friction,
            mouseVelocity: new Vec3(),
            mouseOffset,
            points: [] as any[],
            polyline: null as any,
          };

          const count = pointCount;
          const points = [];
          for (let i = 0; i < count; i++) {
            points.push(new Vec3());
          }

          line.points = points;
          line.polyline = new Polyline(gl, {
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
            },
          });

          line.polyline.mesh.setParent(scene);
          lines.push(line);
        });

        resize();

        const mouse = new Vec3();
        function updateMouse(e: MouseEvent | TouchEvent) {
          let x: number, y: number;
          const rect = container!.getBoundingClientRect();

          if (
            "changedTouches" in e &&
            e.changedTouches &&
            e.changedTouches.length
          ) {
            x = e.changedTouches[0].clientX - rect.left;
            y = e.changedTouches[0].clientY - rect.top;
          } else if ("clientX" in e) {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
          } else {
            return;
          }

          const width = container!.clientWidth;
          const height = container!.clientHeight;
          mouse.set((x / width) * 2 - 1, (y / height) * -2 + 1, 0);
        }

        container.addEventListener("mousemove", updateMouse);
        container.addEventListener("touchstart", updateMouse);
        container.addEventListener("touchmove", updateMouse);

        const tmp = new Vec3();
        let frameId: number;
        let lastTime = performance.now();

        function update() {
          frameId = requestAnimationFrame(update);
          const currentTime = performance.now();
          const dt = currentTime - lastTime;
          lastTime = currentTime;

          lines.forEach((line) => {
            tmp
              .copy(mouse)
              .add(line.mouseOffset)
              .sub(line.points[0])
              .multiply(line.spring);
            line.mouseVelocity.add(tmp).multiply(line.friction);
            line.points[0].add(line.mouseVelocity);

            for (let i = 1; i < line.points.length; i++) {
              if (isFinite(maxAge) && maxAge > 0) {
                const segmentDelay = maxAge / (line.points.length - 1);
                const alpha = Math.min(
                  1,
                  (dt * speedMultiplier) / segmentDelay
                );
                line.points[i].lerp(line.points[i - 1], alpha);
              } else {
                line.points[i].lerp(line.points[i - 1], 0.9);
              }
            }

            if (line.polyline.mesh.program.uniforms.uTime) {
              line.polyline.mesh.program.uniforms.uTime.value =
                currentTime * 0.001;
            }
            line.polyline.updateGeometry();
          });

          renderer.render({ scene });
        }

        update();

        cleanup = () => {
          window.removeEventListener("resize", resize);
          container.removeEventListener("mousemove", updateMouse);
          container.removeEventListener("touchstart", updateMouse);
          container.removeEventListener("touchmove", updateMouse);
          cancelAnimationFrame(frameId);
          if (gl.canvas && gl.canvas.parentNode === container) {
            container.removeChild(gl.canvas);
          }
        };
      } catch (error) {
        console.error("Failed to initialize ribbons:", error);
      }
    };

    initRibbons();

    return () => {
      if (cleanup) cleanup();
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{
        position: "relative",
        zIndex: 1,
        background: "transparent",
        overflow: "hidden",
      }}
    />
  );
};

export default Ribbons;

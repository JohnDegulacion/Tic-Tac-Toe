"use client";

import Ribbons from "@/components/ui/ribbons";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Global Ribbons Background */}
      <div
        style={{
          height: "100vh",
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <Ribbons
          baseThickness={30}
          colors={["#4318FF"]}
          speedMultiplier={0.5}
          maxAge={500}
          enableFade={false}
          enableShaderEffect={true}
          effectAmplitude={2}
          backgroundColor={[0.05, 0.05, 0.1, 1]}
        />
      </div>

      {/* Main Content */}
      <main className="relative z-10">{children}</main>
    </>
  );
}

export default function Footer() {
  return (
    <div className="bg-white text-center py-6">
      <h3
        style={{
          fontFamily: "var(--font-inter), 'Inter', sans-serif",
          fontWeight: "400",
          fontSize: "clamp(14px, 1.5vw, 22px)",
          lineHeight: "48px",
          letterSpacing: "-0.5px",
          color: "#9ca3af",
        }}
      >
        &copy; {new Date().getFullYear()} All Rights Reserved. Design by Works360
      </h3>
    </div>
  );
}
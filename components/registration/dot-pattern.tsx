export function DotPattern() {
  return (
    <div
      className="absolute inset-0 mix-blend-screen opacity-80"
      data-name="Dot Pattern"
    >
      <div
        className="absolute bg-repeat bg-top-left inset-0"
        data-name="Image"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,<svg width="65" height="65" xmlns="http://www.w3.org/2000/svg"><circle cx="32.5" cy="32.5" r="1" fill="rgba(34,197,94,0.35)"/></svg>')`,
          backgroundSize: "65px 65px",
        }}
      />
    </div>
  );
}

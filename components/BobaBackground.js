export default function BobaBackground() {
  return (
    <div className="boba-bg" aria-hidden="true">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="boba-pearl" />
      ))}
    </div>
  );
}

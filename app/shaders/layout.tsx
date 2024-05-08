import Script from "next/script";

const inline = `
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});
`;

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Script id="prevent-gestures">{inline}</Script>
      <div className="main-container">{children}</div>
    </>
  );
}

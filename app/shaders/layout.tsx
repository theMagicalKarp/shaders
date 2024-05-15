// Prevent page from scrolling
const INLINE_STYLE = `
body {
  overflow: hidden;
}

html, body {
  width: 100%;
  height: 100%;
}
`;

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <style>{INLINE_STYLE}</style>
      <div className="absolute bottom-0 left-0 right-0 bottom-0">
        {children}
      </div>
    </>
  );
}

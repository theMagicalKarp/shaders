// Prevent page from scrolling
const INLINE_STYLE = `
* {
margin: 0;
padding: 0;
}

html, body, #root {
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
      {children}
    </>
  );
}

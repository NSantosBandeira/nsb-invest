export function ThemeScript() {
  const script = `
    (function() {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (stored === 'dark' || (!stored && prefersDark)) {
        document.documentElement.classList.add('dark');
      }
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

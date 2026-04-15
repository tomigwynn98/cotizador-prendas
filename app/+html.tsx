import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#1E3A6E" />

        {/* PWA / Apple */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TexQuote" />
        <meta name="format-detection" content="telephone=no" />

        <link rel="manifest" href="/manifest.json" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="shortcut icon" href="/icon-192.png" />

        {/* Apple touch icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="57x57" href="/icon-57.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/icon-72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/icon-76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/icon-114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icon-120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icon-144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />

        {/* Apple splash screens — fallback usa el icon */}
        <link rel="apple-touch-startup-image" href="/icon-512.png" />

        <ResponsiveBackground />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: nativeCSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

function ResponsiveBackground() {
  return <style dangerouslySetInnerHTML={{ __html: `body { background-color: #F4F6FB; }` }} />;
}

const nativeCSS = `
  html, body {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
  }

  /* Evitar zoom automatico en iOS cuando se hace focus en inputs (requiere font-size >= 16px) */
  input, textarea, select {
    font-size: 16px !important;
  }

  /* Status bar safe area padding */
  body {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* Ocultar scrollbar feo en web */
  ::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
`;

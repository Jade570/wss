'use client';

import { AnimatePresence } from 'framer-motion';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* 페이지 전환 애니메이션 */}
        <AnimatePresence mode="wait" initial={false}>
          {children}
        </AnimatePresence>
      </body>
    </html>
  );
}

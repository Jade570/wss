"use client";

import './globals.css';
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const DynamicEarthCanvas = dynamic(() => import("../components/webaudiotest"), {
  ssr: false,
});

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // 클라이언트 마운트 전엔 아무것도 렌더링하지 않음

  return (
    <div style={{background:"#000000ff", margin: 0, overflow: 'hidden' }}>
      <DynamicEarthCanvas />
    </div>
  );
}

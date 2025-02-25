'use client';

import React, { useState, useEffect } from 'react';

const AvoidMouseComponent = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [componentPosition, setComponentPosition] = useState({ x: 200, y: 200 });

  const handleMouseMove = (event) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    const distanceX = componentPosition.x - mousePosition.x;
    const distanceY = componentPosition.y - mousePosition.y;
    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

    if (distance < 100) {
      const angle = Math.atan2(distanceY, distanceX);
      const offsetX = Math.cos(angle) * 50;
      const offsetY = Math.sin(angle) * 50;

      setComponentPosition((prevPosition) => ({
        x: Math.max(0, Math.min(window.innerWidth, prevPosition.x + offsetX)),
        y: Math.max(0, Math.min(window.innerHeight, prevPosition.y + offsetY)),
      }));
    }
  }, [mousePosition]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        left: componentPosition.x,
        top: componentPosition.y,
        width: '50px',
        height: '50px',
        backgroundColor: 'red',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        transition: 'left 0.2s ease-out, top 0.2s ease-out',
      }}
    />
  );
};

export default AvoidMouseComponent;

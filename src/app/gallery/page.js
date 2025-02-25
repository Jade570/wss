'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const images = [
  { name: 'fishcake', description: 'A delicious Korean fishcake.' },
  { name: 'flag', description: 'A beautiful flag representing pride.' },
  { name: 'heart', description: 'A symbol of love and affection.' },
  { name: 'kisses', description: 'A playful kiss emoji.' },
  { name: 'loudspeaker', description: 'A loudspeaker for announcements.' },
  { name: 'note', description: 'A musical note symbolizing harmony.' },
  { name: 'star', description: 'A shining star in the night sky.' },
];

export default function GalleryPage() {
  const [positions, setPositions] = useState([]);

  const generateRandomPosition = (width, height) => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const maxX = screenWidth - width;
    const maxY = screenHeight - height;

    const x = Math.random() * maxX;
    const y = Math.random() * maxY;

    return { x, y };
  };

  const checkOverlap = (newPos, width, height) => {
    return positions.some((pos) => {
      const overlapX = newPos.x < pos.x + width && newPos.x + width > pos.x;
      const overlapY = newPos.y < pos.y + height && newPos.y + height > pos.y;
      return overlapX && overlapY;
    });
  };

  const initializePositions = () => {
    const newPositions = [];
    const imageWidth = 100;
    const imageHeight = 100;

    images.forEach(() => {
      let validPosition = false;
      let position;

      while (!validPosition) {
        position = generateRandomPosition(imageWidth, imageHeight);
        validPosition = !checkOverlap(position, imageWidth, imageHeight);
      }

      newPositions.push(position);
    });

    setPositions(newPositions);
  };

  useEffect(() => {
    initializePositions();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {positions.length > 0 &&
        images.map((image, index) => (
          <motion.div
            key={image.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute',
              left: `${positions[index]?.x || 0}px`,
              top: `${positions[index]?.y || 0}px`,
              cursor: 'pointer',
            }}
          >
            <Link href={`/details/${image.name}`}>
              <motion.img
                src={`/images/${image.name}_idle.png`}
                alt={image.name}
                style={{
                  width: '100px',
                  height: '100px',
                  objectFit: 'contain',
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              />
            </Link>
          </motion.div>
        ))}
    </div>
  );
}

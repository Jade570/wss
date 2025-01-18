'use client';

import React, { useState, useEffect } from 'react';

const images = [
  'fishcake',
  'flag',
  'heart',
  'kisses',
  'loudspeaker',
  'note',
  'star',
];

const ImageGallery = () => {
  const [positions, setPositions] = useState([]);
  const [activeImages, setActiveImages] = useState(
    images.reduce((acc, name) => {
      acc[name] = 'idle';
      return acc;
    }, {})
  );

  const handleClick = (name) => {
    setActiveImages((prevState) => ({
      ...prevState,
      [name]: prevState[name] === 'idle' ? 'hover' : 'idle',
    }));
  };

  const generateRandomPosition = (width, height) => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const x = Math.random() * (screenWidth - width);
    const y = Math.random() * (screenHeight - height);
    return { x, y };
  };

  const checkOverlap = (newPos, width, height) => {
    return positions.some((pos) => {
      const overlapX =
        newPos.x < pos.x + width && newPos.x + width > pos.x;
      const overlapY =
        newPos.y < pos.y + height && newPos.y + height > pos.y;
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
      {positions.length > 0 && // 위치 초기화 후 렌더링
        images.map((name, index) => (
          <div
            key={name}
            onClick={() => handleClick(name)}
            style={{
              position: 'absolute',
              left: `${positions[index]?.x || 0}px`,
              top: `${positions[index]?.y || 0}px`,
              cursor: 'pointer',
            }}
          >
            <img
              src={`/images/${name}_${activeImages[name]}.png`}
              alt={name}
              style={{ width: '100px', height: '100px', objectFit: 'contain' }}
            />
          </div>
        ))}
    </div>
  );
};

export default ImageGallery;

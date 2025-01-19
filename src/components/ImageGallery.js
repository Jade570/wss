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

    const maxX = screenWidth - width;
    const maxY = screenHeight - height;

    const x = Math.random() * maxX;
    const y = Math.random() * maxY;

    return { x, y };
  };

  const findClosestValidPosition = (newPos, width, height) => {
    let { x, y } = newPos;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // 충돌 여부를 검사하면서 위치를 조정
    while (positions.some((pos) => {
      const overlapX =
        x < pos.x + width && x + width > pos.x;
      const overlapY =
        y < pos.y + height && y + height > pos.y;
      return overlapX && overlapY;
    })) {
      // 위치를 조정
      x += 10; // x를 오른쪽으로 이동
      if (x + width > screenWidth) {
        x = 0; // 화면 경계를 초과하면 x를 초기화
        y += 10; // y를 한 칸 아래로 이동
      }
      if (y + height > screenHeight) {
        y = 0; // 화면 경계를 초과하면 y를 초기화
      }
    }

    // 화면 경계를 초과하지 않도록 최종적으로 제한
    x = Math.min(Math.max(0, x), screenWidth - width);
    y = Math.min(Math.max(0, y), screenHeight - height);

    return { x, y };
  };

  const initializePositions = () => {
    const newPositions = [];
    const imageWidth = 100;
    const imageHeight = 100;

    images.forEach(() => {
      let position = generateRandomPosition(imageWidth, imageHeight);
      position = findClosestValidPosition(position, imageWidth, imageHeight);
      newPositions.push(position);
    });

    setPositions(newPositions);
  };

  useEffect(() => {
    initializePositions();
  }, []);

  return (
    <div style={{ position: 'relative', width: '90vw', height: '90vh' }}>
      {positions.length > 0 &&
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

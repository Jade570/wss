'use client';

import React, { useState } from 'react';

const images = [
  { name: 'fishcake', description: 'A delicious Korean fishcake.' },
  { name: 'flag', description: 'A beautiful flag representing pride.' },
  { name: 'heart', description: 'A symbol of love and affection.' },
  { name: 'kisses', description: 'A playful kiss emoji.' },
  { name: 'loudspeaker', description: 'A loudspeaker for announcements.' },
  { name: 'note', description: 'A musical note symbolizing harmony.' },
  { name: 'star', description: 'A shining star in the night sky.' },
];

const ImageGallery = () => {
  const [activeImage, setActiveImage] = useState(null);

  const handleClick = (image) => {
    setActiveImage(image);
  };

  const handleClose = () => {
    setActiveImage(null);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* 이미지 갤러리 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {images.map((image) => (
          <div
            key={image.name}
            onClick={() => handleClick(image)}
            style={{
              cursor: 'pointer',
            }}
          >
            <img
              src={`/images/${image.name}_idle.png`}
              alt={image.name}
              style={{ width: '100px', height: '100px', objectFit: 'contain' }}
            />
          </div>
        ))}
      </div>

      {/* 모달 (이미지가 선택되었을 때만 표시) */}
      {activeImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          {/* 이미지 확대 및 설명 */}
          <div
            style={{
              position: 'relative',
              backgroundColor: '#fff',
              borderRadius: '10px',
              padding: '20px',
              maxWidth: '90%',
              maxHeight: '90%',
              textAlign: 'center',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            <img
              src={`/images/${activeImage.name}_hover.png`}
              alt={activeImage.name}
              style={{
                maxWidth: '100%',
                maxHeight: '60vh',
                marginBottom: '20px',
                borderRadius: '10px',
              }}
            />
            <p style={{ fontSize: '18px', color: '#333' }}>
              {activeImage.description}
            </p>
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#333',
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;

'use client';

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const details = {
  fishcake: 'A delicious Korean fishcake loved by all.',
  flag: 'A beautiful flag representing pride and unity.',
  heart: 'A heart symbol often used to express love and care.',
  kisses: 'A playful kiss emoji for fun conversations.',
  loudspeaker: 'Used for important announcements and celebrations.',
  note: 'A musical note symbolizing creativity and harmony.',
  star: 'A shining star that lights up the night sky.',
};

export default function DetailsPage() {
  const params = useParams(); // params를 가져옵니다.
  const { name } = params; // name을 안전하게 추출
  const description = details[name] || 'No description available.';
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f9f9f9',
        padding: '20px',
      }}
    >
      <img
        src={`/images/${name}_hover.png`}
        alt={name}
        style={{
          maxWidth: '300px',
          maxHeight: '300px',
          marginBottom: '20px',
        }}
      />
      <p style={{ fontSize: '18px', textAlign: 'center', color: '#333' }}>{description}</p>
      <button
        onClick={() => router.push('/gallery')}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Back to Gallery
      </button>
    </motion.div>
  );
}

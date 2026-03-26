import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

const FloatingHearts = () => {
  const [hearts, setHearts] = useState([]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const id = Math.random();
      const left = Math.random() * 95;
      const size = Math.random() * (30 - 15) + 15;
      const duration = Math.random() * (20 - 10) + 10;
      setHearts(prev => [...prev, { id, left, size, duration }]);
      setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), duration * 1000);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {hearts.map(h => (
        <div key={h.id} className="floating-heart text-primary/15" style={{ left: `${h.left}%`, fontSize: `${h.size}px`, animationDuration: `${h.duration}s`, bottom: '-50px' }}>
          <Heart fill="currentColor" />
        </div>
      ))}
    </div>
  );
};

export default FloatingHearts;

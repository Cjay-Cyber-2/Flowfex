/**
 * ContainerScroll — 3D scroll-driven rotation animation.
 * Adapted from the provided TypeScript component to plain JSX.
 */
import React, { useRef } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';

export function ContainerScroll({ titleComponent, children }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const scaleDimensions = () => (isMobile ? [0.74, 0.92] : [1.04, 1]);

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      ref={containerRef}
      style={{
        height: isMobile ? '52rem' : '72rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: isMobile ? '0.75rem' : '2rem',
      }}
    >
      <div
        style={{
          paddingTop: isMobile ? '2rem' : '8rem',
          paddingBottom: isMobile ? '2rem' : '8rem',
          width: '100%',
          position: 'relative',
          perspective: '1000px'
        }}
      >
        <ScrollHeader translate={translate} titleComponent={titleComponent} />
        <ScrollCard rotate={rotate} isMobile={isMobile}>
          {children}
        </ScrollCard>
      </div>
    </div>
  );
}

function ScrollHeader({ translate, titleComponent }) {
  return (
    <motion.div
      style={{ 
        translateY: translate, 
        maxWidth: '68rem', 
        margin: '0 auto 2rem', 
        textAlign: 'center',
        position: 'relative',
        zIndex: 10
      }}
    >
      {titleComponent}
    </motion.div>
  );
}

function ScrollCard({ rotate, isMobile, children }) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        boxShadow: '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003',
        maxWidth: '68rem',
        marginTop: isMobile ? '-1.5rem' : '-2.75rem',
        marginLeft: 'auto',
        marginRight: 'auto',
        height: isMobile ? '36rem' : '48rem',
        width: '100%',
        border: '1px solid rgba(0, 212, 170, 0.18)',
        padding: '0.75rem',
        background: 'linear-gradient(180deg, rgba(13, 19, 27, 0.96), rgba(8, 12, 16, 0.98))',
        borderRadius: '28px',
      }}
    >
      <div
        style={{
          height: '100%',
          width: '100%',
          overflow: 'auto',
          borderRadius: '1rem',
          background: 'var(--surface-01, #181d26)'
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

export default ContainerScroll;

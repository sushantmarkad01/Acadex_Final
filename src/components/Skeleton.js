import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width, height, borderRadius, style, className }) => {
  const styles = {
    width: width,
    height: height,
    borderRadius: borderRadius,
    ...style,
  };
  return <div className={`skeleton ${className || ''}`} style={styles} />;
};

export default Skeleton;
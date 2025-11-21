import React from 'react';
import './Skeleton.css';

const Skeleton = ({ type = 'text', height, width, style }) => {
  const classes = `skeleton skeleton-${type}`;
  return <div className={classes} style={{ height, width, ...style }}></div>;
};

export default Skeleton;
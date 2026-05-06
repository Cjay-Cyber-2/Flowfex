import React from 'react';
import './AuthBackdrop.css';

export default function AuthBackdrop() {
  return (
    <div className="auth-backdrop" aria-hidden="true">
      <div className="auth-backdrop__glow auth-backdrop__glow--left" />
      <div className="auth-backdrop__glow auth-backdrop__glow--right" />
      <div className="auth-backdrop__orb auth-backdrop__orb--primary" />
      <div className="auth-backdrop__orb auth-backdrop__orb--secondary" />
      <div className="auth-backdrop__grid" />
      <div className="auth-backdrop__beam auth-backdrop__beam--one" />
      <div className="auth-backdrop__beam auth-backdrop__beam--two" />
      <div className="auth-backdrop__vignette" />
    </div>
  );
}

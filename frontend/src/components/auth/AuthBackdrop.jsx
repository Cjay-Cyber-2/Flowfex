import React from 'react';
import './AuthBackdrop.css';

export default function AuthBackdrop({ variant = 'default' }) {
  return (
    <div
      className={`auth-backdrop${variant === 'signup' ? ' auth-backdrop--signup' : ''}`}
      aria-hidden="true"
    >
      <div className="auth-backdrop__glow auth-backdrop__glow--left" />
      <div className="auth-backdrop__glow auth-backdrop__glow--right" />
      <div className="auth-backdrop__orb-slot auth-backdrop__orb-slot--tl">
        <div className="auth-backdrop__orb" />
      </div>
      <div className="auth-backdrop__orb-slot auth-backdrop__orb-slot--br">
        <div className="auth-backdrop__orb" />
      </div>
      <div className="auth-backdrop__grid" />
      <div className="auth-backdrop__beam auth-backdrop__beam--one" />
      <div className="auth-backdrop__beam auth-backdrop__beam--two" />
      <div className="auth-backdrop__vignette" />
    </div>
  );
}

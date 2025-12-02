import { useEffect, useRef, useCallback } from 'react';

/**
 * SoundManager - Handles audio alerts for the application
 */

// Create audio context lazily
let audioContext = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

// Generate alert sounds programmatically
const playTone = (frequency, duration, type = 'sine', volume = 0.3) => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.value = volume;
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// Different alert sounds
export const playAlertSound = (severity) => {
  switch (severity) {
    case 'CRITICAL':
      // Urgent siren-like sound
      playTone(880, 0.15, 'square', 0.4);
      setTimeout(() => playTone(660, 0.15, 'square', 0.4), 150);
      setTimeout(() => playTone(880, 0.15, 'square', 0.4), 300);
      setTimeout(() => playTone(660, 0.15, 'square', 0.4), 450);
      break;
    case 'HIGH':
      // Double beep
      playTone(800, 0.1, 'sine', 0.3);
      setTimeout(() => playTone(800, 0.1, 'sine', 0.3), 150);
      break;
    case 'MEDIUM':
      // Single beep
      playTone(600, 0.15, 'sine', 0.2);
      break;
    case 'LOW':
      // Soft ping
      playTone(400, 0.1, 'sine', 0.1);
      break;
    default:
      playTone(500, 0.1, 'sine', 0.15);
  }
};

export const playSuccessSound = () => {
  playTone(523, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.2), 100);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.2), 200);
};

export const playClickSound = () => {
  playTone(1000, 0.05, 'sine', 0.1);
};

export const playIntrusionSound = () => {
  // Distinctive warning for zone intrusion
  playTone(440, 0.1, 'sawtooth', 0.3);
  setTimeout(() => playTone(880, 0.1, 'sawtooth', 0.3), 100);
  setTimeout(() => playTone(440, 0.1, 'sawtooth', 0.3), 200);
  setTimeout(() => playTone(880, 0.2, 'sawtooth', 0.4), 300);
};

/**
 * Hook to manage sound alerts based on flight data
 */
export function useSoundAlerts(flights, enabled = true) {
  const previousIntrusionsRef = useRef(new Set());
  const lastAlertTimeRef = useRef(0);
  
  useEffect(() => {
    if (!enabled || !Array.isArray(flights)) return;
    
    const now = Date.now();
    const currentIntrusions = new Set();
    
    flights.forEach(flight => {
      if (flight.in_restricted_area) {
        const key = flight.transponder_id || flight.id;
        currentIntrusions.add(key);
        
        // New intrusion detected
        if (!previousIntrusionsRef.current.has(key)) {
          // Throttle sounds (max once per second)
          if (now - lastAlertTimeRef.current > 1000) {
            playIntrusionSound();
            lastAlertTimeRef.current = now;
          }
        }
      }
    });
    
    previousIntrusionsRef.current = currentIntrusions;
  }, [flights, enabled]);
}

export default { playAlertSound, playSuccessSound, playClickSound, playIntrusionSound, useSoundAlerts };

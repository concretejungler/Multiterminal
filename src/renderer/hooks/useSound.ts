import { useEffect, useRef } from 'react';

declare const window: Window & { api: any };

export function useSoundNotification() {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const off = window.api.onNotificationDone((_id: string, config: { sound: string; volume: number }) => {
      playSound(config.sound, config.volume);
    });
    return off;
  }, []);

  function playSound(sound: string, volume: number) {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    const freqs: Record<string, number> = { chime: 880, bell: 660, ding: 1200 };
    oscillator.frequency.value = freqs[sound] ?? 880;
    oscillator.type = 'sine';
    gainNode.gain.value = volume * 0.3;
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.stop(ctx.currentTime + 0.5);
  }
}

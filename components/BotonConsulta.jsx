'use client';
import { useState } from 'react';
import AgendarConsulta from '@/components/AgendarConsulta';

export default function BotonConsulta({ className = 'btn-olivo', label = 'Agendar una consulta' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>{label}</button>
      <AgendarConsulta open={open} onClose={() => setOpen(false)} />
    </>
  );
}

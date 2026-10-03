import { CalendarCheck, CheckCircle2, Mail } from 'lucide-react';
import { useEffect } from 'react';

export default function LandingConfirmacaoAgendamento() {
  useEffect(() => {
    document.title = 'Agendamento confirmado | Learning by Working';
  }, []);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'linear-gradient(145deg, #050914, #0b1740 60%, #08102a)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <section style={{ width: 'min(100%, 640px)', padding: 'clamp(28px, 6vw, 56px)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 24, background: 'rgba(12, 25, 55, .9)', boxShadow: '0 24px 80px rgba(0,0,0,.28)', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, display: 'grid', placeItems: 'center', margin: '0 auto 24px', borderRadius: 20, background: 'rgba(34,197,94,.13)', color: '#4ade80' }}>
          <CheckCircle2 size={34} aria-hidden="true" />
        </div>
        <p style={{ margin: '0 0 12px', color: '#72e6bd', fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase' }}>Learning by Working</p>
        <h1 style={{ margin: '0 auto 16px', maxWidth: 520, fontSize: 'clamp(30px, 5vw, 44px)', lineHeight: 1.12, letterSpacing: '-.04em' }}>Sua apresentação está agendada.</h1>
        <p style={{ margin: '0 auto', maxWidth: 490, color: 'rgba(255,255,255,.76)', fontSize: 16, lineHeight: 1.7 }}>O convite e os detalhes da reunião foram enviados para o e-mail informado no agendamento.</p>
        <div style={{ display: 'grid', gap: 14, margin: '30px auto', maxWidth: 440, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: 16, borderRadius: 14, background: 'rgba(255,255,255,.06)' }}>
            <Mail size={20} style={{ flex: '0 0 auto', marginTop: 2, color: '#72e6bd' }} aria-hidden="true" />
            <span style={{ color: 'rgba(255,255,255,.82)', lineHeight: 1.55 }}>Confira sua caixa de entrada e o calendário para encontrar o link da reunião.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: 16, borderRadius: 14, background: 'rgba(255,255,255,.06)' }}>
            <CalendarCheck size={20} style={{ flex: '0 0 auto', marginTop: 2, color: '#72e6bd' }} aria-hidden="true" />
            <span style={{ color: 'rgba(255,255,255,.82)', lineHeight: 1.55 }}>Na apresentação, você vai conhecer o programa e poderá tirar suas dúvidas.</span>
          </div>
        </div>
        <p style={{ margin: '22px 0 0', color: 'rgba(255,255,255,.5)', fontSize: 13 }}>Você pode fechar esta página depois de conferir o e-mail.</p>
      </section>
    </main>
  );
}

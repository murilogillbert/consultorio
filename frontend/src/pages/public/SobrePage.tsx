import { useState, useEffect, useRef } from 'react'
import { Target, Eye, Heart, Award, Camera, Star, Users, Clock, Stethoscope, ChevronLeft, ChevronRight } from 'lucide-react'

function AnimatedCounter({ target, label }: { target: number; label: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true
        const duration = 2000
        const startTime = Date.now()
        const animate = () => {
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(eased * target))
          if (progress < 1) requestAnimationFrame(animate)
        }
        animate()
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <div className="counter-item" ref={ref}>
      <div className="number">{count.toLocaleString('pt-BR')}+</div>
      <div className="label">{label}</div>
    </div>
  )
}

const timeline = [
  { year: '2004', title: 'Fundação', description: 'Inauguração da primeira unidade no Jardim Paulista com foco em cardiologia.' },
  { year: '2008', title: 'Expansão', description: 'Ampliação para 10 especialidades e inauguração do centro de diagnósticos.' },
  { year: '2013', title: 'Certificação ISO', description: 'Obtenção da certificação ISO 9001 em gestão de qualidade hospitalar.' },
  { year: '2018', title: 'Nova Unidade', description: 'Inauguração da segunda unidade na região de Alphaville.' },
  { year: '2022', title: 'Prêmio Nacional', description: 'Reconhecida como uma das melhores clínicas do Brasil pela Revista Saúde.' },
  { year: '2024', title: 'Telemedicina', description: 'Lançamento da plataforma digital de telemedicina com mais de 30 especialidades.' },
]

const testimonials = [
  { quote: 'Atendimento excepcional. Me senti acolhida desde o momento que entrei na clínica. Recomendo de olhos fechados!', author: 'Fernanda R.', role: 'Paciente há 5 anos' },
  { quote: 'Os médicos são extremamente competentes e atenciosos. A estrutura da clínica é impecável.', author: 'Roberto M.', role: 'Paciente há 3 anos' },
  { quote: 'Finalmente encontrei uma clínica onde me sinto segura. Equipe dedicada e ambiente acolhedor.', author: 'Camila S.', role: 'Paciente há 2 anos' },
]

export default function SobrePage() {
  const [testimonialIdx, setTestimonialIdx] = useState(0)

  return (
    <>
      {/* Hero */}
      <div className="about-hero">
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <h1>Sobre a Clínica Vitalis</h1>
          <p>Mais de 20 anos cuidando da saúde de milhares de famílias com excelência, dedicação e tecnologia de ponta.</p>
        </div>
      </div>

      {/* Timeline */}
      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>Nossa Trajetória</h2>
          <div className="timeline">
            {timeline.map((item, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-year">{item.year}</div>
                <div className="timeline-content" style={{ marginLeft: i % 2 === 0 ? 0 : 'auto', marginRight: i % 2 === 0 ? 'auto' : 0 }}>
                  <h3>{item.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission / Vision / Values */}
      <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>Nossos Valores</h2>
          <div className="mvv-grid stagger-children">
            <div className="mvv-card">
              <Target size={40} />
              <h3>Missão</h3>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                Proporcionar saúde e bem-estar com atendimento humanizado, ético e baseado em evidências científicas.
              </p>
            </div>
            <div className="mvv-card">
              <Eye size={40} />
              <h3>Visão</h3>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                Ser referência nacional em excelência médica, inovação e experiência do paciente até 2030.
              </p>
            </div>
            <div className="mvv-card">
              <Heart size={40} />
              <h3>Valores</h3>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                Ética, empatia, excelência, inovação contínua e compromisso com o bem-estar de cada paciente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>Nossas Instalações</h2>
          <div className="gallery-grid stagger-children">
            {['Recepção', 'Consultório 1', 'Sala de Exames', 'Laboratório', 'Sala de Espera', 'Centro Cirúrgico'].map((label, i) => (
              <div key={i} className="gallery-item">
                <div style={{ textAlign: 'center' }}>
                  <Camera size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <p style={{ fontSize: 13 }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Animated Counters */}
      <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="container">
          <div className="counters-row">
            <AnimatedCounter target={15000} label="Pacientes Atendidos" />
            <AnimatedCounter target={20} label="Anos de Experiência" />
            <AnimatedCounter target={30} label="Especialidades" />
            <AnimatedCounter target={45} label="Profissionais" />
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>Certificações</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
            {['ISO 9001', 'CFM', 'ANVISA', 'ONA Nível 3'].map((cert, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={28} color="var(--color-accent-gold)" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{cert}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>Depoimentos</h2>
          <div className="testimonials-carousel" style={{ position: 'relative' }}>
            <div className="testimonial animate-fade-in" key={testimonialIdx}>
              <blockquote>{testimonials[testimonialIdx].quote}</blockquote>
              <div className="author">{testimonials[testimonialIdx].author}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{testimonials[testimonialIdx].role}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 'var(--space-6)' }}>
              <button className="hero-arrow" style={{ position: 'static', transform: 'none' }} onClick={() => setTestimonialIdx(p => (p - 1 + testimonials.length) % testimonials.length)}>
                <ChevronLeft size={18} />
              </button>
              <div className="hero-dots" style={{ position: 'static', transform: 'none', display: 'flex', alignItems: 'center' }}>
                {testimonials.map((_, i) => (
                  <button key={i} className={`hero-dot${i === testimonialIdx ? ' active' : ''}`} onClick={() => setTestimonialIdx(i)} />
                ))}
              </div>
              <button className="hero-arrow" style={{ position: 'static', transform: 'none' }} onClick={() => setTestimonialIdx(p => (p + 1) % testimonials.length)}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

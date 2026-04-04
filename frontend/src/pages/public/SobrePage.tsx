import { useEffect, useRef, useState } from 'react'
import { Target, Eye, Heart, Camera } from 'lucide-react'
import { usePublicClinic } from '../../hooks/useClinics'

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

const defaultTimeline = [
  { year: '2004', title: 'Fundação', description: 'Inauguração da primeira unidade no Jardim Paulista com foco em cardiologia.' },
  { year: '2008', title: 'Expansão', description: 'Ampliação para 10 especialidades e inauguração do centro de diagnósticos.' },
  { year: '2013', title: 'Certificação ISO', description: 'Obtenção da certificação ISO 9001 em gestão de qualidade hospitalar.' },
  { year: '2018', title: 'Nova Unidade', description: 'Inauguração da segunda unidade na região de Alphaville.' },
  { year: '2022', title: 'Prêmio Nacional', description: 'Reconhecida como uma das melhores clínicas do Brasil pela Revista Saúde.' },
  { year: '2024', title: 'Telemedicina', description: 'Lançamento da plataforma digital de telemedicina com mais de 30 especialidades.' },
]

export default function SobrePage() {
  const { data: clinic, isLoading } = usePublicClinic()

  const timeline = clinic?.milestones?.length ? clinic.milestones : defaultTimeline

  if (isLoading) return <div style={{ marginTop: 'var(--navbar-height)', padding: 100, textAlign: 'center' }}>Carregando...</div>

  return (
    <>
      {/* Hero */}
      <div className="about-hero">
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <h1>Sobre a {clinic?.name || 'Clínica'}</h1>
          <p>{clinic?.description || 'Mais de 20 anos cuidando da saúde de milhares de famílias com excelência, dedicação e tecnologia de ponta.'}</p>
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
                {clinic?.mission || 'Proporcionar saúde e bem-estar com atendimento humanizado, ético e baseado em evidências científicas.'}
              </p>
            </div>
            <div className="mvv-card">
              <Eye size={40} />
              <h3>Visão</h3>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                {clinic?.vision || 'Ser referência nacional em excelência médica, inovação e experiência do paciente até 2030.'}
              </p>
            </div>
            <div className="mvv-card">
              <Heart size={40} />
              <h3>Valores</h3>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                {clinic?.values || 'Ética, empatia, excelência, inovação contínua e compromisso com o bem-estar de cada paciente.'}
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
            {(clinic?.galleryUrls?.length ? clinic.galleryUrls : [1, 2, 3, 4, 5, 6]).map((item, i) => (
              <div key={i} className="gallery-item">
                {typeof item === 'string' ? (
                   <img src={item} alt={`Galeria ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Camera size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <p style={{ fontSize: 13 }}>Instalação {i+1}</p>
                  </div>
                )}
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

    </>
  )
}

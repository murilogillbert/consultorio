import { Link } from 'react-router-dom'
import { usePublicClinic } from '../../hooks/useClinics'

export default function TermosUsoPage() {
  const { data: clinic } = usePublicClinic()
  const clinicName = clinic?.name || 'Clínica'
  const contactEmail = clinic?.email || 'contato@psicologiaeexistir.com.br'

  return (
    <section className="legal-page">
      <div className="container">
        <div className="legal-header">
          <Link to="/" className="legal-back-link">Voltar para a página inicial</Link>
          <h1>Termos de Uso</h1>
          <p>
            Estes termos regulam o uso do site, canais digitais, recursos de agendamento e atendimento
            online de {clinicName}.
          </p>
          <span>Última atualização: 21 de abril de 2026</span>
        </div>

        <div className="legal-content">
          <h2>1. Aceitação dos termos</h2>
          <p>
            Ao acessar este site, solicitar atendimento, agendar consultas ou enviar mensagens por nossos
            canais digitais, você declara que leu e concorda com estes Termos de Uso e com a nossa
            Política de Privacidade.
          </p>

          <h2>2. Finalidade do site</h2>
          <p>
            O site permite conhecer os serviços da clínica, consultar informações institucionais, solicitar
            agendamentos, acompanhar consultas e conversar com a equipe por canais disponíveis. As
            informações publicadas não substituem avaliação profissional individualizada.
          </p>

          <h2>3. Agendamentos e comunicação</h2>
          <p>
            Solicitações de consulta, remarcação, cancelamento ou atendimento enviadas pelo site, WhatsApp,
            Facebook ou Instagram dependem de confirmação da equipe da clínica. Mensagens podem ser
            registradas para continuidade do atendimento, segurança e organização administrativa.
          </p>

          <h2>4. Uso adequado dos canais</h2>
          <p>
            Você concorda em fornecer informações verdadeiras, não utilizar os canais para fins ilícitos,
            não enviar conteúdo ofensivo, discriminatório, abusivo, fraudulento ou que viole direitos de
            terceiros, e não tentar acessar áreas restritas sem autorização.
          </p>

          <h2>5. Integrações com Meta</h2>
          <p>
            Quando você se comunica com a clínica por Facebook, Instagram ou outros produtos Meta, a
            interação também está sujeita aos termos e políticas da Meta. Usamos essas integrações apenas
            para receber, organizar e responder mensagens relacionadas ao atendimento solicitado.
          </p>

          <h2>6. Privacidade e proteção de dados</h2>
          <p>
            O tratamento de dados pessoais é descrito na nossa Política de Privacidade. Ao usar os canais
            digitais, você reconhece que dados necessários ao atendimento poderão ser coletados e tratados
            conforme essa política e a legislação aplicável.
          </p>

          <h2>7. Propriedade intelectual</h2>
          <p>
            Textos, imagens, identidade visual, layout, marcas e demais conteúdos do site pertencem à
            clínica ou a terceiros autorizados. É proibida a reprodução não autorizada para fins comerciais
            ou que prejudiquem a clínica.
          </p>

          <h2>8. Limitação de responsabilidade</h2>
          <p>
            Trabalhamos para manter o site disponível e seguro, mas não garantimos funcionamento
            ininterrupto. Podemos realizar manutenções, alterar funcionalidades ou suspender recursos para
            correções, segurança, exigências legais ou melhoria do serviço.
          </p>

          <h2>9. Alterações dos termos</h2>
          <p>
            Estes termos podem ser atualizados periodicamente. A versão vigente será publicada nesta página
            com a data de atualização correspondente.
          </p>

          <h2>10. Contato</h2>
          <p>
            Para dúvidas sobre estes termos, entre em contato pelo e-mail{' '}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        </div>
      </div>
    </section>
  )
}

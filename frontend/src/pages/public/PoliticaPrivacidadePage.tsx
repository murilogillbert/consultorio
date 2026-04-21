import { Link } from 'react-router-dom'
import { usePublicClinic } from '../../hooks/useClinics'

export default function PoliticaPrivacidadePage() {
  const { data: clinic } = usePublicClinic()
  const clinicName = clinic?.name || 'Clínica'
  const contactEmail = clinic?.email || 'contato@psicologiaeexistir.com.br'

  return (
    <section className="legal-page">
      <div className="container">
        <div className="legal-header">
          <Link to="/" className="legal-back-link">Voltar para a página inicial</Link>
          <h1>Política de Privacidade</h1>
          <p>
            Esta política explica como {clinicName} coleta, utiliza, armazena e protege dados pessoais
            em seus canais digitais, incluindo integrações com Facebook, Instagram, WhatsApp e serviços
            da Meta Platforms.
          </p>
          <span>Última atualização: 21 de abril de 2026</span>
        </div>

        <div className="legal-content">
          <h2>1. Quem somos</h2>
          <p>
            {clinicName} oferece atendimento, agendamento, comunicação com pacientes e gestão de
            relacionamento por meio deste site, canais próprios e integrações autorizadas com plataformas
            de terceiros.
          </p>

          <h2>2. Dados que podemos coletar</h2>
          <p>
            Podemos coletar nome, e-mail, telefone, informações de agendamento, mensagens enviadas por
            formulários, chat, WhatsApp, Facebook Messenger ou Instagram Direct, além de identificadores
            técnicos necessários para reconhecer a conversa e responder ao atendimento solicitado.
          </p>
          <p>
            Quando você interage conosco por Facebook ou Instagram, podemos receber dados disponibilizados
            pela Meta, como identificador da conversa, nome público do perfil quando disponível, conteúdo da
            mensagem, anexos enviados, data e horário da interação e informações necessárias para operar a
            integração.
          </p>

          <h2>3. Como usamos os dados</h2>
          <p>
            Usamos os dados para agendar consultas, responder solicitações, confirmar horários, manter
            histórico de atendimento, prestar suporte, cumprir obrigações legais e melhorar a segurança dos
            nossos canais. Dados recebidos da Meta são usados somente para fornecer a funcionalidade
            solicitada pelo usuário, como responder mensagens enviadas ao perfil da clínica.
          </p>

          <h2>4. Integrações com Facebook, Instagram e Meta</h2>
          <p>
            Este site pode usar APIs e webhooks da Meta para receber e responder mensagens enviadas por
            Facebook ou Instagram. O tratamento desses dados respeita os Termos da Plataforma Meta, as
            permissões concedidas ao aplicativo e as políticas aplicáveis aos produtos Meta.
          </p>
          <p>
            Não vendemos dados recebidos da Meta, não os utilizamos para publicidade comportamental fora
            da finalidade autorizada e não transferimos essas informações para terceiros sem necessidade
            operacional, obrigação legal ou consentimento aplicável.
          </p>

          <h2>5. Compartilhamento de dados</h2>
          <p>
            Podemos compartilhar dados com provedores essenciais para hospedagem, banco de dados, envio de
            mensagens, segurança, autenticação, suporte técnico e cumprimento de obrigações legais. Esses
            fornecedores devem tratar as informações apenas conforme nossas instruções e medidas de
            segurança compatíveis.
          </p>

          <h2>6. Retenção e exclusão</h2>
          <p>
            Mantemos dados pelo tempo necessário para prestar o serviço, preservar histórico assistencial e
            administrativo, cumprir obrigações legais ou resolver disputas. Você pode solicitar exclusão,
            correção ou acesso aos seus dados pelo e-mail {contactEmail}.
          </p>
          <p>
            Para dados recebidos por Facebook ou Instagram, você também pode remover permissões ou conexões
            diretamente nas configurações da sua conta Meta. Após uma solicitação válida de exclusão,
            removeremos ou anonimizaremos os dados quando não houver obrigação legal de retenção.
          </p>

          <h2>7. Segurança</h2>
          <p>
            Aplicamos controles técnicos e administrativos para proteger dados contra acesso indevido,
            perda, alteração ou uso não autorizado. Nenhum sistema é totalmente imune a riscos, mas
            trabalhamos para reduzir esses riscos de forma proporcional à natureza das informações.
          </p>

          <h2>8. Seus direitos</h2>
          <p>
            Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade, anonimização,
            bloqueio, exclusão e informações sobre compartilhamento, conforme a legislação aplicável. Para
            exercer esses direitos, entre em contato pelo e-mail {contactEmail}.
          </p>

          <h2>9. Contato</h2>
          <p>
            Para dúvidas sobre esta política, uso de dados da Meta ou solicitações de exclusão, fale conosco
            pelo e-mail <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        </div>
      </div>
    </section>
  )
}

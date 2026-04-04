/**
 * Helper functions to build WhatsApp template components
 */

export const whatsappTemplates = {
  /**
   * Generates components for appointment_confirmation template
   * Expected variables: {{1}} - Patient Name, {{2}} - Date, {{3}} - Time, {{4}} - Professional Name
   */
  appointment_confirmation: (patientName: string, date: string, time: string, professionalName: string) => [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: patientName },
        { type: 'text', text: date },
        { type: 'text', text: time },
        { type: 'text', text: professionalName },
      ],
    },
  ],

  /**
   * Generates components for a general notification with a single variable
   * Expected variables: {{1}} - Dynamic message content
   */
  general_notification: (content: string) => [
      {
          type: 'body',
          parameters: [
              { type: 'text', text: content }
          ]
      }
  ]
}

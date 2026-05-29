// Mensajes de error centralizados.
//
// Centralizar tiene dos beneficios:
//  1) Tests acoplados al CONCEPTO, no a la formulación literal del mensaje.
//     Cambiar el wording de un error no rompe N tests; toca un solo lugar.
//  2) Documenta los errores del API en un único índice, facilitando revisión
//     de calidad, traducción futura, o evolución a i18n por header.

module.exports = {
  // Auth (401)
  ERR_NO_TOKEN: 'No token provided',
  ERR_INVALID_TOKEN: 'Invalid token',
  ERR_USER_NOT_FOUND: 'User not found',

  // Email verificación (403)
  ERR_EMAIL_NOT_VERIFIED: 'Email no verificado. Verifica tu correo para continuar.',

  // Authz (403)
  ERR_NOT_ORGANIZER: 'Not the organizer',
  ERR_ACCESS_DENIED: 'Access denied',

  // Fund (404 / 422)
  ERR_FUND_NOT_FOUND: 'Fund not found',
  ERR_FUND_NOT_ACTIVE: 'Fund is not active',
  ERR_DEADLINE_EXPIRED: 'La fecha límite del fondo ha vencido',
  ERR_CANNOT_DELETE_WITH_CONTRIBS: 'Cannot delete fund with contributions',

  // Participants (409)
  ERR_USER_ALREADY_PARTICIPANT: 'User already a participant',
};

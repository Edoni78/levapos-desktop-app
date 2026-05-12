let currentUser = null

export function setSessionUser(u) {
  currentUser = u
}

export function getSessionUser() {
  return currentUser
}

export function clearSession() {
  currentUser = null
}

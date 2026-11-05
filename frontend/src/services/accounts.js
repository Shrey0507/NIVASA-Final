/**
 * Account management service.
 * All backend calls for accounts should go through these functions.
 */

/**
 * List all managed accounts.
 * @returns {Promise<Array<{id: string, email: string, full_name: string, role: string, hostel: string, username: string, usn: string, is_active: boolean}>>}
 */
export async function listAccounts() {
  // TODO: connect backend
  // Return mock data for UI development
  // eslint-disable-next-line no-unused-vars
  const _ = () => {}; // Placeholder to avoid unused warnings
  return [];
}

/**
 * Create a new account directly with a password.
 * @param {Object} params
 * @param {string} params.email - Official email address
 * @param {string} params.password - Initial password (min 8 chars)
 * @param {string} params.role - "student" | "super_admin" | "boys_admin" | "girls_admin"
 * @param {string} params.fullName - Full name of the user
 * @param {string} [params.username] - Optional username
 * @param {string} [params.usn] - Student USN (required for students)
 * @param {string} params.hostel - "boys" | "girls"
 * @returns {Promise<{id: string, email: string, role: string}>}
 */
export async function createAccount({ email, password, role, fullName, username, usn, hostel }) {
  // TODO: connect backend
  // eslint-disable-next-line no-unused-vars
  const _ = { email, password, role, fullName, username, usn, hostel };
  throw new Error("Not connected yet");
}

/**
 * Reset a user's password.
 * @param {string} userId - User ID
 * @param {string} newPassword - New password (min 8 chars)
 */
export async function resetPassword(userId, newPassword) {
  // TODO: connect backend
  // eslint-disable-next-line no-unused-vars
  const _ = { userId, newPassword };
  throw new Error("Not connected yet");
}

/**
 * Delete a user account.
 * @param {string} userId - User ID
 */
export async function deleteAccount(userId) {
  // TODO: connect backend
  // eslint-disable-next-line no-unused-vars
  const _ = userId;
  throw new Error("Not connected yet");
}

/**
 * Resolve a login identifier (email, username, or USN) to an email address.
 * @param {string} input - The login identifier
 * @returns {Promise<string>} - The email address
 */
export async function resolveLoginIdentifier(input) {
  // TODO: connect backend
  // For now, if it looks like an email, return it directly
  if (input.includes("@")) {
    return input.toLowerCase().trim();
  }
  // eslint-disable-next-line no-unused-vars
  const _ = input;
  throw new Error("Not connected yet");
}